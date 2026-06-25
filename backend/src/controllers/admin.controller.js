const asyncHandler   = require('../utils/asyncHandler');
const User           = require('../models/user');
const StudentProfile = require('../models/StudentProfile');
const IndustrySupervisorProfile   = require('../models/IndustrySupervisorProfile');
const InstitutionSupervisorProfile = require('../models/InstitutionSupervisorProfile');
const Internship     = require('../models/Internship');
const LogbookWeek    = require('../models/LogbookWeek');
const DailyLogEntry  = require('../models/DailyLogEntry');
const Attendance     = require('../models/Attendance');
const Grade          = require('../models/Grade');
const Notification   = require('../models/Notification');
const { calcSystemScore } = require('../utils/calculateGrades');

// ── Helpers ───────────────────────────────────────────────────────────────────

const getStartMonday = (startDate) => {
  const d = new Date(startDate);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  else if (day === 0) d.setDate(d.getDate() + 1);
  const wd = d.getDay();
  d.setDate(d.getDate() - (wd - 1));
  d.setHours(0, 0, 0, 0);
  return d;
};

const getMondayOf = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
};

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
exports.getStats = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalIndustry,
    totalInstitution,
    totalAdmins,
    activeInternships,
    totalLogbookEntries,
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'industry_supervisor' }),
    User.countDocuments({ role: 'institution_supervisor' }),
    User.countDocuments({ role: 'admin' }),
    Internship.countDocuments({ isActive: true }),
    DailyLogEntry.countDocuments(),
  ]);

  res.json({
    success: true,
    data: {
      totalStudents,
      totalIndustry,
      totalInstitution,
      totalAdmins,
      activeInternships,
      totalLogbookEntries,
      totalUsers: totalStudents + totalIndustry + totalInstitution + totalAdmins,
    },
  });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Query params: role, search, page, limit, isActive
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20, isActive } = req.query;

  const filter = {};
  if (role)   filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    const rx = new RegExp(search, 'i');
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password -refreshToken -resetPasswordToken -resetPasswordExpiry')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // Attach role-specific profile in one batch per role group
  const studentIds    = users.filter((u) => u.role === 'student').map((u) => u._id);
  const industryIds   = users.filter((u) => u.role === 'industry_supervisor').map((u) => u._id);
  const institutionIds = users.filter((u) => u.role === 'institution_supervisor').map((u) => u._id);

  const [studentProfiles, industryProfiles, institutionProfiles] = await Promise.all([
    StudentProfile.find({ user: { $in: studentIds } }).select('user matricNumber university department internshipPlace internshipStartDate internshipEndDate').lean(),
    IndustrySupervisorProfile.find({ user: { $in: industryIds } }).select('user company jobTitle department').lean(),
    InstitutionSupervisorProfile.find({ user: { $in: institutionIds } }).select('user department officeAddress').lean(),
  ]);

  const spMap  = Object.fromEntries(studentProfiles.map((p) => [p.user.toString(), p]));
  const ipMap  = Object.fromEntries(industryProfiles.map((p) => [p.user.toString(), p]));
  const isnMap = Object.fromEntries(institutionProfiles.map((p) => [p.user.toString(), p]));

  const enriched = users.map((u) => {
    const id = u._id.toString();
    let profile = null;
    if (u.role === 'student')                profile = spMap[id]  ?? null;
    if (u.role === 'industry_supervisor')     profile = ipMap[id]  ?? null;
    if (u.role === 'institution_supervisor')  profile = isnMap[id] ?? null;
    return { ...u, profile };
  });

  res.json({
    success: true,
    data: enriched,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  });
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password -refreshToken -resetPasswordToken -resetPasswordExpiry')
    .lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  let profile = null;
  if (user.role === 'student')
    profile = await StudentProfile.findOne({ user: user._id }).lean();
  else if (user.role === 'industry_supervisor')
    profile = await IndustrySupervisorProfile.findOne({ user: user._id }).lean();
  else if (user.role === 'institution_supervisor')
    profile = await InstitutionSupervisorProfile.findOne({ user: user._id }).lean();

  const internship = user.role === 'student'
    ? await Internship.findOne({ student: user._id, isActive: true })
        .populate('institutionSupervisor', 'firstName lastName')
        .populate('industrySupervisor', 'firstName lastName')
        .lean()
    : null;

  res.json({ success: true, data: { user, profile, internship } });
});

// ── PATCH /api/admin/users/:id/toggle-active ──────────────────────────────────
exports.toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
  }

  user.isActive = !user.isActive;
  await user.save();

  res.json({ success: true, data: { _id: user._id, isActive: user.isActive } });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  // Cascade-delete student data
  if (user.role === 'student') {
    const internship = await Internship.findOne({ student: user._id });
    if (internship) {
      const weeks = await LogbookWeek.find({ internship: internship._id }).select('_id');
      const weekIds = weeks.map((w) => w._id);
      await Promise.all([
        DailyLogEntry.deleteMany({ logbookWeek: { $in: weekIds } }),
        LogbookWeek.deleteMany({ internship: internship._id }),
        Attendance.deleteMany({ student: user._id }),
        Grade.deleteMany({ student: user._id }),
        Internship.deleteOne({ _id: internship._id }),
      ]);
    }
    await StudentProfile.deleteOne({ user: user._id });
  } else if (user.role === 'industry_supervisor') {
    await IndustrySupervisorProfile.deleteOne({ user: user._id });
  } else if (user.role === 'institution_supervisor') {
    await InstitutionSupervisorProfile.deleteOne({ user: user._id });
  }

  await User.deleteOne({ _id: user._id });

  res.json({ success: true, message: 'User and all associated data deleted.' });
});

// ── POST /api/admin/sync-logbook-weeks/:studentId ─────────────────────────────
exports.syncLogbookWeeks = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const profile = await StudentProfile.findOne({ user: studentId })
    .select('internshipStartDate internshipEndDate internshipWeeks')
    .lean();

  if (!profile?.internshipStartDate) {
    return res.status(400).json({ success: false, message: 'Student has no internship start date set.' });
  }

  const internship = await Internship.findOne({ student: studentId, isActive: true });
  if (!internship) {
    return res.status(404).json({ success: false, message: 'No active internship found for student.' });
  }

  await Internship.updateOne(
    { _id: internship._id },
    { $set: { startDate: profile.internshipStartDate, endDate: profile.internshipEndDate || internship.endDate } }
  );

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const firstMon  = getStartMonday(profile.internshipStartDate);
  const thisMon   = getMondayOf(new Date());
  const now       = new Date();

  // Find weeks that have entries — never delete those
  const existingWeeks = await LogbookWeek.find({ student: studentId }).select('_id weekNumber weekStartDate').lean();
  const weekIdsWithEntries = new Set(
    (await DailyLogEntry.distinct('logbookWeek', { logbookWeek: { $in: existingWeeks.map((w) => w._id) } }))
      .map((id) => id.toString())
  );

  // Only delete weeks that have NO entries
  const weekIdsToDelete = existingWeeks
    .filter((w) => !weekIdsWithEntries.has(w._id.toString()))
    .map((w) => w._id);
  if (weekIdsToDelete.length) await LogbookWeek.deleteMany({ _id: { $in: weekIdsToDelete } });

  // Rebuild the expected set of weeks
  const remainingWeeks = existingWeeks.filter((w) => weekIdsWithEntries.has(w._id.toString()));
  const existingByNum  = Object.fromEntries(remainingWeeks.map((w) => [w.weekNumber, w]));

  const toCreate = [];
  for (let d = new Date(firstMon); d <= thisMon; d.setDate(d.getDate() + 7)) {
    const fri = new Date(d);
    fri.setDate(d.getDate() + 4);
    fri.setHours(23, 59, 59, 999);
    const weekNum = Math.max(1, Math.floor((new Date(d) - firstMon) / msPerWeek) + 1);
    if (existingByNum[weekNum]) continue; // already exists with entries, skip

    const isFirst = d.getTime() === firstMon.getTime();
    let offset = 0;
    if (isFirst) {
      const s = new Date(profile.internshipStartDate);
      s.setHours(0, 0, 0, 0);
      if (s.getTime() > firstMon.getTime())
        offset = Math.min(Math.round((s.getTime() - firstMon.getTime()) / 86400000), 4);
    }

    toCreate.push({
      internship:     internship._id,
      student:        studentId,
      weekNumber:     weekNum,
      weekStartDate:  new Date(d),
      weekEndDate:    new Date(fri),
      isLocked:       fri.getTime() < now.getTime(),
      startDayOffset: offset,
    });
  }

  if (toCreate.length) await LogbookWeek.insertMany(toCreate);

  res.json({
    success: true,
    message: `Synced logbook weeks. Created ${toCreate.length} week(s). Preserved ${weekIdsWithEntries.size} week(s) with existing entries.`,
    data: { weeksCreated: toCreate.length, weeksPreserved: weekIdsWithEntries.size, internshipStartDate: profile.internshipStartDate },
  });
});

// ── POST /api/admin/recover-logbook/:studentId ────────────────────────────────
exports.recoverLogbookEntries = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const allEntries = await DailyLogEntry.find({ student: studentId }).lean();
  if (!allEntries.length) {
    return res.json({ success: true, message: 'No entries found for this student.', data: { recovered: 0, moved: 0 } });
  }

  const allWeeks = await LogbookWeek.find({ student: studentId })
    .select('_id weekNumber weekStartDate weekEndDate startDayOffset')
    .sort({ weekStartDate: 1 })
    .lean();

  if (!allWeeks.length) {
    return res.status(400).json({ success: false, message: 'No logbook weeks found — run Sync first.' });
  }

  const existingWeekIds = new Set(allWeeks.map((w) => w._id.toString()));
  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const findCorrectWeek = (entry) => {
    const dayIdx = DAY_ORDER.indexOf(entry.dayOfWeek);
    const ts = new Date(entry.createdAt).getTime();

    // Only consider weeks where this day is valid (dayIdx >= startDayOffset)
    const validWeeks = allWeeks.filter((w) => dayIdx >= (w.startDayOffset ?? 0));
    const candidates = validWeeks.length ? validWeeks : allWeeks;

    // Exact createdAt match within valid weeks
    const exact = candidates.find((w) =>
      ts >= new Date(w.weekStartDate).getTime() &&
      ts <= new Date(w.weekEndDate).getTime()
    );
    if (exact) return exact;

    // 3-day grace period match
    const grace = candidates.find((w) =>
      ts >= new Date(w.weekStartDate).getTime() &&
      ts <= new Date(w.weekEndDate).getTime() + 3 * 24 * 60 * 60 * 1000
    );
    // Fallback: latest valid week
    return grace ?? candidates[candidates.length - 1];
  };

  let recovered = 0;
  let moved = 0;

  for (const entry of allEntries) {
    const correctWeek = findCorrectWeek(entry);
    if (!correctWeek) continue;

    const currentWeekId = entry.logbookWeek.toString();
    const correctWeekId = correctWeek._id.toString();
    const isOrphaned = !existingWeekIds.has(currentWeekId);
    const isMisplaced = currentWeekId !== correctWeekId;

    if (!isOrphaned && !isMisplaced) continue;

    // Skip if a different entry for the same day already exists in the target week
    const duplicate = await DailyLogEntry.exists({
      logbookWeek: correctWeek._id,
      dayOfWeek: entry.dayOfWeek,
      _id: { $ne: entry._id },
    });
    if (duplicate) continue;

    await DailyLogEntry.updateOne({ _id: entry._id }, { $set: { logbookWeek: correctWeek._id } });
    if (isOrphaned) recovered++; else moved++;
  }

  const total = recovered + moved;
  res.json({
    success: true,
    message: total
      ? `Recovery complete. Fixed ${total} entr${total === 1 ? 'y' : 'ies'} (${recovered} orphaned, ${moved} misplaced).`
      : 'All entries are already in the correct weeks.',
    data: { recovered, moved, total },
  });
});

// ── GET /api/admin/users/:id/dashboard ────────────────────────────────────────
exports.getUserDashboard = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id)
    .select('-password -refreshToken -resetPasswordToken -resetPasswordExpiry')
    .lean();
  if (!targetUser) return res.status(404).json({ success: false, message: 'User not found.' });

  const { role } = targetUser;

  if (role === 'student') {
    const userId = targetUser._id;
    const [profile, internship, notifications, allAttendance, allWeeks, grades] = await Promise.all([
      StudentProfile.findOne({ user: userId }).lean(),
      Internship.findOne({ student: userId, isActive: true })
        .populate('industrySupervisor',    'firstName lastName profileImage')
        .populate('institutionSupervisor', 'firstName lastName profileImage')
        .lean(),
      Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Attendance.find({ student: userId }).lean(),
      LogbookWeek.find({ student: userId }).sort({ weekNumber: -1 }).lean(),
      Grade.find({ student: userId }).sort({ weekNumber: 1 }).lean(),
    ]);

    const latestWeek = allWeeks[0] || null;
    let currentWeek  = null;
    if (latestWeek) {
      const ORDER   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const entries = await DailyLogEntry.find({ logbookWeek: latestWeek._id }).lean();
      currentWeek   = {
        ...latestWeek,
        entries: entries.sort((a, b) => ORDER.indexOf(a.dayOfWeek) - ORDER.indexOf(b.dayOfWeek)),
      };
    }

    const presentCount = allAttendance.filter((a) => ['present', 'late'].includes(a.status)).length;

    return res.json({
      success: true,
      data: {
        user: targetUser,
        role,
        profile,
        internship: internship ? {
          _id:                     internship._id,
          company:                 internship.company,
          department:              internship.department,
          startDate:               internship.startDate,
          endDate:                 internship.endDate,
          totalWeeks:              internship.totalWeeks,
          status:                  internship.status,
          nominatedSupervisorInfo: internship.nominatedSupervisorInfo || null,
        } : null,
        supervisors: internship ? {
          industry:    internship.industrySupervisor    || null,
          institution: internship.institutionSupervisor || null,
        } : null,
        attendanceSummary: { presentDays: presentCount, totalDays: allAttendance.length },
        currentWeek,
        grades,
        notifications,
      },
    });
  }

  if (role === 'industry_supervisor') {
    const [profile, internships] = await Promise.all([
      IndustrySupervisorProfile.findOne({ user: targetUser._id }).lean(),
      Internship.find({ industrySupervisor: targetUser._id, isActive: true })
        .populate('student', 'firstName lastName profileImage')
        .lean(),
    ]);

    const studentIds = internships.map((i) => i.student._id);
    const [studentProfiles, grades] = await Promise.all([
      StudentProfile.find({ user: { $in: studentIds } }).lean(),
      Grade.find({ student: { $in: studentIds } }).lean(),
    ]);

    const students = internships.map((internship) => {
      const student = internship.student;
      const sid     = student._id.toString();
      const sp      = studentProfiles.find((p) => p.user.toString() === sid);
      const graded  = grades.filter((g) => g.student.toString() === sid && g.totalScore !== null);
      const avgGrade = graded.length
        ? graded.reduce((s, g) => s + g.totalScore, 0) / graded.length
        : null;
      return {
        _id:          student._id,
        name:         `${student.firstName} ${student.lastName}`,
        profileImage: student.profileImage,
        matricNumber: sp?.matricNumber || '',
        company:      internship.company,
        avgGrade,
      };
    });

    return res.json({ success: true, data: { user: targetUser, role, profile, students } });
  }

  if (role === 'institution_supervisor') {
    const [profile, internships] = await Promise.all([
      InstitutionSupervisorProfile.findOne({ user: targetUser._id }).lean(),
      Internship.find({ institutionSupervisor: targetUser._id, isActive: true })
        .populate('student', 'firstName lastName profileImage')
        .lean(),
    ]);

    const studentIds = internships.map((i) => i.student._id);
    const [studentProfiles, grades] = await Promise.all([
      StudentProfile.find({ user: { $in: studentIds } }).lean(),
      Grade.find({ student: { $in: studentIds } }).lean(),
    ]);

    const students = internships.map((internship) => {
      const student = internship.student;
      const sid     = student._id.toString();
      const sp      = studentProfiles.find((p) => p.user.toString() === sid);
      const graded  = grades.filter((g) => g.student.toString() === sid && g.totalScore !== null);
      const avgScore = graded.length
        ? graded.reduce((s, g) => s + g.totalScore, 0) / graded.length
        : null;
      return {
        _id:          student._id,
        name:         `${student.firstName} ${student.lastName}`,
        profileImage: student.profileImage,
        matricNumber: sp?.matricNumber || '',
        company:      internship.company,
        avgScore,
      };
    });

    return res.json({ success: true, data: { user: targetUser, role, profile, students } });
  }

  return res.json({ success: true, data: { user: targetUser, role, profile: null } });
});

// ── PATCH /api/admin/users/:id/profile ───────────────────────────────────────
exports.updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const { firstName, lastName, ...rest } = req.body;
  const userUpdate = {};
  if (firstName?.trim()) userUpdate.firstName = firstName.trim();
  if (lastName?.trim())  userUpdate.lastName  = lastName.trim();

  const updatedUser = Object.keys(userUpdate).length
    ? await User.findByIdAndUpdate(user._id, { $set: userUpdate }, { new: true })
        .select('-password -refreshToken').lean()
    : await User.findById(user._id).select('-password -refreshToken').lean();

  const ADMIN_EDITABLE = {
    student: [
      'phone', 'bio', 'matricNumber', 'university', 'department', 'level',
      'state', 'lga', 'internshipPlace', 'internshipStartDate', 'internshipEndDate', 'internshipWeeks',
    ],
    industry_supervisor:    ['phone', 'officeAddress', 'jobTitle', 'department', 'company', 'staffId'],
    institution_supervisor: ['phone', 'officeAddress', 'department', 'university', 'staffId'],
  };

  const ProfileModelMap = {
    student:                StudentProfile,
    industry_supervisor:    IndustrySupervisorProfile,
    institution_supervisor: InstitutionSupervisorProfile,
  };

  const Model = ProfileModelMap[user.role];
  let profile = null;
  if (Model) {
    const allowed       = ADMIN_EDITABLE[user.role] ?? [];
    const profileUpdate = {};
    for (const field of allowed) {
      if (rest[field] !== undefined) {
        if (field === 'internshipStartDate' || field === 'internshipEndDate') {
          profileUpdate[field] = rest[field] ? new Date(rest[field]) : null;
        } else if (field === 'internshipWeeks') {
          profileUpdate[field] = rest[field] ? Number(rest[field]) : null;
        } else {
          profileUpdate[field] = typeof rest[field] === 'string'
            ? rest[field].trim() || undefined
            : rest[field];
        }
      }
    }

    if (Object.keys(profileUpdate).length) {
      profile = await Model.findOneAndUpdate(
        { user: user._id },
        { $set: profileUpdate },
        { new: true }
      ).lean();

      if (user.role === 'student') {
        const internshipSync = {};
        if (profileUpdate.internshipStartDate !== undefined) internshipSync.startDate = profileUpdate.internshipStartDate;
        if (profileUpdate.internshipEndDate   !== undefined) internshipSync.endDate   = profileUpdate.internshipEndDate;
        if (Object.keys(internshipSync).length) {
          await Internship.updateOne({ student: user._id }, { $set: internshipSync });
        }
      }
    } else {
      profile = await Model.findOne({ user: user._id }).lean();
    }
  }

  res.json({ success: true, data: { user: updatedUser, profile } });
});

// ── GET /api/admin/users/:id/logbook ─────────────────────────────────────────
exports.getStudentLogbookAdmin = asyncHandler(async (req, res) => {
  const { id: studentId } = req.params;

  const [studentUser, studentProfile, weeks] = await Promise.all([
    User.findById(studentId, 'firstName lastName profileImage role').lean(),
    StudentProfile.findOne({ user: studentId }).lean(),
    LogbookWeek.find({ student: studentId }).sort({ weekNumber: 1 }).lean(),
  ]);

  if (!studentUser) return res.status(404).json({ success: false, message: 'User not found.' });
  if (studentUser.role !== 'student') {
    return res.status(400).json({ success: false, message: 'User is not a student.' });
  }

  const weekIds = weeks.map((w) => w._id);
  const entries = weekIds.length
    ? await DailyLogEntry.find({ logbookWeek: { $in: weekIds } }).lean()
    : [];

  const ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weeksWithEntries = weeks.map((w) => ({
    _id:                   w._id,
    weekNumber:            w.weekNumber,
    weekStartDate:         w.weekStartDate,
    weekEndDate:           w.weekEndDate,
    isLocked:              w.isLocked,
    supervisorComment:     w.supervisorComment,
    commentedAt:           w.commentedAt,
    weeklyImage:           w.weeklyImage           || null,
    weeklyImageUploadedAt: w.weeklyImageUploadedAt || null,
    startDayOffset:        w.startDayOffset,
    entries: entries
      .filter((e) => e.logbookWeek.toString() === w._id.toString())
      .sort((a, b) => ORDER.indexOf(a.dayOfWeek) - ORDER.indexOf(b.dayOfWeek)),
  }));

  return res.json({
    success: true,
    data: {
      student: {
        _id:          studentUser._id,
        name:         `${studentUser.firstName} ${studentUser.lastName}`,
        profileImage: studentUser.profileImage,
        matricNumber: studentProfile?.matricNumber || '',
        university:   studentProfile?.university   || '',
        department:   studentProfile?.department   || '',
      },
      weeks: weeksWithEntries,
    },
  });
});

// ── POST /api/admin/users/:id/logbook/:weekId/comment ─────────────────────────
exports.commentOnWeekAdmin = asyncHandler(async (req, res) => {
  const { id: studentId, weekId } = req.params;
  const { comment } = req.body;

  if (!comment?.trim()) return res.status(400).json({ success: false, message: 'Comment is required.' });

  const week = await LogbookWeek.findOneAndUpdate(
    { _id: weekId, student: studentId },
    { supervisorComment: comment.trim(), commentedAt: new Date(), commentedBy: req.user._id },
    { new: true }
  );
  if (!week) return res.status(404).json({ success: false, message: 'Logbook week not found.' });

  return res.json({ success: true, data: { week } });
});

// ── POST /api/admin/users/:id/grade/:weekId ────────────────────────────────────
exports.submitGradeAdmin = asyncHandler(async (req, res) => {
  const { id: studentId, weekId } = req.params;
  const { supervisorScore, supervisorNote } = req.body;

  if (supervisorScore === undefined || supervisorScore === null) {
    return res.status(400).json({ success: false, message: 'supervisorScore is required.' });
  }
  const score = Number(supervisorScore);
  if (isNaN(score) || score < 0 || score > 50) {
    return res.status(400).json({ success: false, message: 'supervisorScore must be 0–50.' });
  }

  const [week, internship] = await Promise.all([
    LogbookWeek.findOne({ _id: weekId, student: studentId }),
    Internship.findOne({ student: studentId, isActive: true }),
  ]);
  if (!week)       return res.status(404).json({ success: false, message: 'Logbook week not found.' });
  if (!internship) return res.status(404).json({ success: false, message: 'No active internship found.' });

  let grade = await Grade.findOne({ student: studentId, weekNumber: week.weekNumber });
  if (!grade) {
    grade = new Grade({
      student:     studentId,
      internship:  internship._id,
      logbookWeek: weekId,
      weekNumber:  week.weekNumber,
    });
  }

  if (!grade.isSystemCalculated) {
    const [entries, attendance] = await Promise.all([
      DailyLogEntry.find({ logbookWeek: weekId }),
      Attendance.find({ student: studentId, date: { $gte: week.weekStartDate, $lte: week.weekEndDate } }),
    ]);
    const { attendanceScore, logbookScore, systemScore } = calcSystemScore(attendance, entries);
    grade.attendanceScore    = attendanceScore;
    grade.logbookScore       = logbookScore;
    grade.systemScore        = systemScore;
    grade.isSystemCalculated = true;
  }

  grade.supervisorScore = score;
  grade.supervisorNote  = supervisorNote?.trim() || null;
  grade.gradedBy        = req.user._id;
  grade.gradedAt        = new Date();
  grade.totalScore      = (grade.systemScore || 0) + score;

  await grade.save();
  return res.json({ success: true, data: { grade } });
});

// ── PATCH /api/admin/users/:id/supervisors ────────────────────────────────────
exports.changeSupervisorsAdmin = asyncHandler(async (req, res) => {
  const { id: studentId } = req.params;
  const { industrySupervisorId, institutionSupervisorId } = req.body;

  const student = await User.findById(studentId).select('role');
  if (!student) return res.status(404).json({ success: false, message: 'User not found.' });
  if (student.role !== 'student') return res.status(400).json({ success: false, message: 'User is not a student.' });

  const internship = await Internship.findOne({ student: studentId, isActive: true });
  if (!internship) return res.status(404).json({ success: false, message: 'No active internship found for this student.' });

  const setFields = {};

  if (industrySupervisorId !== undefined) {
    if (industrySupervisorId) {
      const sup = await User.findById(industrySupervisorId).select('role');
      if (!sup || sup.role !== 'industry_supervisor') {
        return res.status(400).json({ success: false, message: 'Invalid industry supervisor ID.' });
      }
      setFields.industrySupervisor = industrySupervisorId;
    } else {
      setFields.industrySupervisor = null;
    }
  }

  if (institutionSupervisorId !== undefined) {
    if (institutionSupervisorId) {
      const sup = await User.findById(institutionSupervisorId).select('role');
      if (!sup || sup.role !== 'institution_supervisor') {
        return res.status(400).json({ success: false, message: 'Invalid institution supervisor ID.' });
      }
      setFields.institutionSupervisor = institutionSupervisorId;
    } else {
      setFields.institutionSupervisor = null;
    }
  }

  const updated = await Internship.findByIdAndUpdate(
    internship._id,
    { $set: setFields },
    { new: true }
  )
    .populate('industrySupervisor',    'firstName lastName email profileImage')
    .populate('institutionSupervisor', 'firstName lastName email profileImage')
    .lean();

  return res.json({ success: true, data: { internship: updated } });
});

// ── GET /api/admin/users/:id/attendance ───────────────────────────────────────
exports.getStudentAttendanceAdmin = asyncHandler(async (req, res) => {
  const { id: studentId } = req.params;

  const student = await User.findById(studentId).select('firstName lastName role');
  if (!student) return res.status(404).json({ success: false, message: 'User not found.' });
  if (student.role !== 'student') return res.status(400).json({ success: false, message: 'User is not a student.' });

  const records = await Attendance.find({ student: studentId }).sort({ date: -1 }).lean();

  return res.json({ success: true, data: { records } });
});

// ── PATCH /api/admin/users/:id/attendance/:attendanceId ───────────────────────
exports.updateAttendanceAdmin = asyncHandler(async (req, res) => {
  const { id: studentId, attendanceId } = req.params;
  const { status, checkInTime, checkOutTime, missedCheckout } = req.body;

  const existing = await Attendance.findOne({ _id: attendanceId, student: studentId });
  if (!existing) return res.status(404).json({ success: false, message: 'Attendance record not found.' });

  const VALID_STATUSES = ['present', 'absent', 'late', 'half_day'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  const setFields = {};
  if (status !== undefined)         setFields.status = status;
  if (checkInTime !== undefined)    setFields['checkIn.time']  = checkInTime  ? new Date(checkInTime)  : null;
  if (checkOutTime !== undefined)   setFields['checkOut.time'] = checkOutTime ? new Date(checkOutTime) : null;
  if (missedCheckout !== undefined) setFields.missedCheckout   = Boolean(missedCheckout);

  const updated = await Attendance.findOneAndUpdate(
    { _id: attendanceId, student: studentId },
    { $set: setFields },
    { new: true }
  ).lean();

  return res.json({ success: true, data: { record: updated } });
});
