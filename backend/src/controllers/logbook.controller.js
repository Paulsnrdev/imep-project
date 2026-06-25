const asyncHandler        = require('../utils/asyncHandler');
const LogbookWeek         = require('../models/LogbookWeek');
const DailyLogEntry       = require('../models/DailyLogEntry');
const Attendance          = require('../models/Attendance');
const Grade               = require('../models/Grade');
const Internship          = require('../models/Internship');
const StudentProfile      = require('../models/StudentProfile');
const { calcSystemScore } = require('../utils/calculateGrades');
const { allocateInstitutionSupervisor } = require('../services/supervisorAllocation.service');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Monday 00:00:00 of the calendar week containing `date` (Sun goes to previous Mon)
const getMondayOf = (date) => {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
};

// Monday 00:00:00 for the FIRST logbook week of an internship.
// Weekend start → use the following Monday instead of the previous one.
const getStartMonday = (startDate) => {
  const d   = new Date(startDate);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);      // Sat → next Mon
  else if (day === 0) d.setDate(d.getDate() + 1); // Sun → next Mon
  // Now guaranteed to be a weekday; walk back to that week's Monday
  const wd = d.getDay();
  d.setDate(d.getDate() - (wd - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

// How many Mon-based days to nullify in the first week (0=Mon start, 1=Tue, 2=Wed, …)
const calcStartDayOffset = (startDate, firstMonday) => {
  const s = new Date(startDate);
  s.setHours(0, 0, 0, 0);
  // If the actual start is on or before the Monday, no nullification needed
  if (s.getTime() <= firstMonday.getTime()) return 0;
  const diffDays = Math.round((s.getTime() - firstMonday.getTime()) / 86400000);
  return Math.min(diffDays, 4); // cap at 4 (Fri = last possible start day)
};

// Mirrors the frontend timelock: Mon 7:30 AM → Fri 9:00 PM WAT (UTC+1)
const isWeekEditable = (weekStartDate, weekEndDate, isLocked) => {
  if (isLocked) return false;
  const now       = new Date();
  const watOffset = 60;
  const watNow    = new Date(now.getTime() + watOffset * 60 * 1000);
  const day  = watNow.getUTCDay();
  const hour = watNow.getUTCHours();
  const min  = watNow.getUTCMinutes();
  const mins = hour * 60 + min;
  const afterMonOpen   = day > 1 || (day === 1 && mins >= 7 * 60 + 30);
  const beforeFriClose = day < 5 || (day === 5 && mins <= 21 * 60);
  return afterMonOpen && beforeFriClose;
};

// ── GET /api/logbook/weeks ────────────────────────────────────────────────────
exports.getWeeks = asyncHandler(async (req, res) => {
  // Auto-create any week shells the cron missed (covers first-week and server-downtime gaps)
  let internship = await Internship.findOne({ student: req.user._id, isActive: true }).lean();
  console.log('[getWeeks] student:', req.user._id, '| internship found:', !!internship, '| startDate:', internship?.startDate);

  // Recovery: internship record missing — happens when no supervisor was available at onboarding.
  // Try to create the record now so the student can access their logbook immediately.
  if (!internship) {
    const profile = await StudentProfile.findOne({ user: req.user._id })
      .select('internshipStartDate internshipEndDate internshipPlace internshipWeeks allocatedInstitutionSupervisor')
      .lean();

    if (profile) {
      // Use previously allocated supervisor or try a fresh allocation
      let supervisorId = profile.allocatedInstitutionSupervisor || null;
      if (!supervisorId) {
        supervisorId = await allocateInstitutionSupervisor(req.user._id);
      }

      try {
        const created = await Internship.create({
          student:               req.user._id,
          institutionSupervisor: supervisorId || null,
          startDate:             profile.internshipStartDate || null,
          endDate:               profile.internshipEndDate   || null,
          company:               profile.internshipPlace     || null,
          totalWeeks:            profile.internshipWeeks     || null,
        });
        internship = created.toObject();
        console.log('[getWeeks] recovery: created new internship', internship._id);
      } catch (e) {
        // Internship already exists (possibly inactive) — find it regardless of isActive
        console.log('[getWeeks] recovery catch: code', e.code, e.message);
        if (e.code !== 11000) throw e;
        internship = await Internship.findOne({ student: req.user._id }).lean();
        if (internship && !internship.isActive) {
          await Internship.updateOne({ _id: internship._id }, { $set: { isActive: true } });
          internship = { ...internship, isActive: true };
        }
        console.log('[getWeeks] recovery: found existing internship', internship?._id, 'isActive:', internship?.isActive);
      }
    }
  }

  // Ensure Internship.startDate is in sync with StudentProfile.internshipStartDate.
  // The profile page writes to StudentProfile but historically did not update Internship.
  if (internship) {
    const profile = await StudentProfile.findOne({ user: req.user._id })
      .select('internshipStartDate internshipEndDate').lean();
    if (profile?.internshipStartDate) {
      const profTime = new Date(profile.internshipStartDate).getTime();
      const intTime  = internship.startDate ? new Date(internship.startDate).getTime() : null;
      if (profTime !== intTime) {
        await Internship.updateOne(
          { _id: internship._id },
          { $set: { startDate: profile.internshipStartDate, ...(profile.internshipEndDate && { endDate: profile.internshipEndDate }) } }
        );
        internship = { ...internship, startDate: profile.internshipStartDate, endDate: profile.internshipEndDate ?? internship.endDate };
      }
    }
  }

  if (internship && internship.startDate && new Date(internship.startDate) <= new Date()) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const firstMon  = getStartMonday(internship.startDate); // handles mid-week/weekend starts
    const thisMon   = getMondayOf(new Date());
    const now       = new Date();

    const existing = await LogbookWeek.find({ internship: internship._id })
      .select('weekStartDate')
      .lean();
    const knownTimes = new Set(existing.map((w) => getMondayOf(w.weekStartDate).getTime()));

    const toCreate = [];
    for (let d = new Date(firstMon); d <= thisMon; d.setDate(d.getDate() + 7)) {
      if (!knownTimes.has(d.getTime())) {
        const fri = new Date(d);
        fri.setDate(d.getDate() + 4);
        fri.setHours(23, 59, 59, 999);
        const isFirst  = d.getTime() === firstMon.getTime();
        const offset   = isFirst ? calcStartDayOffset(internship.startDate, firstMon) : 0;
        toCreate.push({
          internship:     internship._id,
          student:        internship.student,
          weekNumber:     Math.max(1, Math.floor((d - firstMon) / msPerWeek) + 1),
          weekStartDate:  new Date(d),
          weekEndDate:    new Date(fri),
          isLocked:       fri.getTime() < now.getTime(),
          startDayOffset: offset,
        });
      }
    }
    console.log('[getWeeks] weeks to create:', toCreate.length, '| existing:', knownTimes.size);
    if (toCreate.length) {
      try {
        await LogbookWeek.insertMany(toCreate, { ordered: false });
        console.log('[getWeeks] insertMany succeeded');
      } catch (e) {
        // Ignore duplicate-key errors (week already exists for this student/weekNumber)
        const hasNonDupe = e.writeErrors?.some((we) => we.code !== 11000) ?? (e.code !== 11000);
        console.log('[getWeeks] insertMany error code:', e.code, '| writeErrors:', e.writeErrors?.length, '| hasNonDupe:', hasNonDupe);
        if (hasNonDupe) throw e;
      }
    }

    // Patch first week's startDayOffset for records created before this field existed.
    // Match by weekNumber:1 — date-exact matching is unreliable across timezone offsets.
    const correctOffset = calcStartDayOffset(internship.startDate, firstMon);
    await LogbookWeek.updateOne(
      { internship: internship._id, weekNumber: 1, startDayOffset: { $ne: correctOffset } },
      { $set: { startDayOffset: correctOffset } }
    );
  }

  const weeks = await LogbookWeek.find({ student: req.user._id })
    .sort({ weekNumber: -1 })
    .lean();
  console.log('[getWeeks] final weeks count:', weeks.length);

  const weekIds = weeks.map((w) => w._id);
  const entries = await DailyLogEntry.find({ logbookWeek: { $in: weekIds } })
    .select('logbookWeek dayOfWeek')
    .lean();

  const entryMap = {};
  for (const e of entries) {
    const key = e.logbookWeek.toString();
    if (!entryMap[key]) entryMap[key] = [];
    entryMap[key].push(e.dayOfWeek);
  }

  const result = weeks.map((w) => ({
    ...w,
    entries: (entryMap[w._id.toString()] ?? []).map((day) => ({ dayOfWeek: day })),
  }));

  res.json({ success: true, data: result });
});

// ── GET /api/logbook/weeks/:weekId/entries ────────────────────────────────────
exports.getWeekEntries = asyncHandler(async (req, res) => {
  const week = await LogbookWeek.findOne({ _id: req.params.weekId, student: req.user._id });
  if (!week) return res.status(404).json({ success: false, message: 'Week not found.' });

  const entries = await DailyLogEntry.find({ logbookWeek: week._id }).lean();
  res.json({ success: true, data: entries });
});

// ── POST /api/logbook/weeks/:weekId/entries (upsert by dayOfWeek) ─────────────
exports.upsertEntry = asyncHandler(async (req, res) => {
  const week = await LogbookWeek.findOne({ _id: req.params.weekId, student: req.user._id });
  if (!week) return res.status(404).json({ success: false, message: 'Week not found.' });

  if (!isWeekEditable(week.weekStartDate, week.weekEndDate, week.isLocked)) {
    return res.status(403).json({ success: false, message: 'This week is locked and cannot be edited.' });
  }

  const { dayOfWeek, activitiesCarriedOut, skillsLearned, challenges, planForTomorrow } = req.body;

  if (!DAYS.includes(dayOfWeek)) {
    return res.status(400).json({ success: false, message: 'Invalid day of week.' });
  }

  // Reject entries for days before the student's internship start (nullified days)
  const offset = week.startDayOffset ?? 0;
  if (offset > 0 && DAYS.indexOf(dayOfWeek) < offset) {
    return res.status(400).json({
      success: false,
      message: `${dayOfWeek} is before your internship start date and cannot be filled.`,
    });
  }

  if (!activitiesCarriedOut?.trim()) {
    return res.status(400).json({ success: false, message: 'Activities carried out is required.' });
  }

  const entry = await DailyLogEntry.findOneAndUpdate(
    { logbookWeek: week._id, dayOfWeek },
    {
      student:              req.user._id,
      logbookWeek:          week._id,
      dayOfWeek,
      activitiesCarriedOut: activitiesCarriedOut.trim(),
      skillsLearned:        skillsLearned?.trim() ?? '',
      challenges:           challenges?.trim() ?? '',
      planForTomorrow:      planForTomorrow?.trim() ?? '',
    },
    { upsert: true, new: true }
  );

  // Recalculate system grade immediately after every entry save
  const internship = await Internship.findOne({ student: req.user._id, isActive: true }).lean();
  if (internship) {
    const [allEntries, attendance] = await Promise.all([
      DailyLogEntry.find({ logbookWeek: week._id }).lean(),
      Attendance.find({
        student: req.user._id,
        date:    { $gte: week.weekStartDate, $lte: week.weekEndDate },
      }).lean(),
    ]);

    const { attendanceScore, logbookScore, systemScore } = calcSystemScore(attendance, allEntries);

    const existing = await Grade.findOne({ student: req.user._id, logbookWeek: week._id });
    await Grade.findOneAndUpdate(
      { student: req.user._id, logbookWeek: week._id },
      {
        $set: {
          student:             req.user._id,
          internship:          internship._id,
          logbookWeek:         week._id,
          weekNumber:          week.weekNumber,
          attendanceScore,
          logbookScore,
          systemScore,
          isSystemCalculated:  true,
          // Recompute total if supervisor has already graded
          ...(existing?.supervisorScore != null && {
            totalScore: systemScore + existing.supervisorScore,
          }),
        },
      },
      { upsert: true }
    );
  }

  res.json({ success: true, data: entry });
});

// ── POST /api/logbook/weeks/:weekId/image ─────────────────────────────────────
// Student uploads one image per week — only allowed if all 5 daily entries are
// filled and the week is not yet locked (enforced by Friday 9 PM cron).
exports.uploadWeeklyImage = asyncHandler(async (req, res) => {
  const week = await LogbookWeek.findOne({ _id: req.params.weekId, student: req.user._id });
  if (!week) return res.status(404).json({ success: false, message: 'Week not found.' });

  if (week.isLocked) {
    return res.status(403).json({ success: false, message: 'This week is locked. Image upload not allowed.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file provided.' });
  }

  // Enforce: all active daily entries must be filled before upload is allowed
  const required = 5 - (week.startDayOffset ?? 0);
  const entries  = await DailyLogEntry.find({ logbookWeek: week._id }).lean();
  if (entries.length < required) {
    return res.status(403).json({
      success: false,
      message: `You must complete all ${required} daily entries before uploading the weekly image (${entries.length}/${required} done).`,
      data: { entriesCompleted: entries.length, required },
    });
  }

  week.weeklyImageUploadedAt   = new Date();
  await week.save();

  res.json({ success: true, data: { weeklyImage: week.weeklyImage, uploadedAt: week.weeklyImageUploadedAt } });
});

// ── POST /api/logbook/weeks/:weekId/comment ───────────────────────────────────
// ONLY industry supervisors may write or update this comment.
exports.addSupervisorComment = asyncHandler(async (req, res) => {
  if (req.user.role !== 'industry_supervisor') {
    return res.status(403).json({ success: false, message: 'Only industry supervisors can add comments.' });
  }

  const { comment } = req.body;
  if (!comment?.trim()) {
    return res.status(400).json({ success: false, message: 'Comment text is required.' });
  }

  // The week must belong to one of this supervisor's students
  const week = await LogbookWeek.findById(req.params.weekId);
  if (!week) return res.status(404).json({ success: false, message: 'Week not found.' });

  week.supervisorComment = comment.trim();
  week.commentedAt       = new Date();
  week.commentedBy       = req.user._id;
  await week.save();

  res.json({ success: true, data: { supervisorComment: week.supervisorComment, commentedAt: week.commentedAt } });
});
