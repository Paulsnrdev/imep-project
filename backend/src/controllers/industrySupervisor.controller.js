const IndustrySupervisorProfile = require('../models/IndustrySupervisorProfile');
const Internship      = require('../models/Internship');
const Attendance      = require('../models/Attendance');
const LogbookWeek     = require('../models/LogbookWeek');
const DailyLogEntry   = require('../models/DailyLogEntry');
const Grade           = require('../models/Grade');
const StudentProfile  = require('../models/StudentProfile');
const Conversation    = require('../models/Conversation');
const User            = require('../models/user');
const { calcSystemScore }  = require('../utils/calculateGrades');
const countWorkingDays     = require('../utils/countWorkingDays');

// ── helpers ────────────────────────────────────────────────────────────────────

const getTodayRange = () => {
  const WAT = 60 * 60 * 1000;
  const watNow = new Date(Date.now() + WAT);
  watNow.setUTCHours(0, 0, 0, 0);
  return { from: new Date(watNow.getTime() - WAT), to: new Date(watNow.getTime() - WAT + 86400000) };
};

const buildStudentsData = async (internships) => {
  if (!internships.length) return [];

  const studentIds = internships.map((i) => i.student._id);
  const { from, to } = getTodayRange();

  const [profiles, todayAttendance, allAttendance, allWeeks, allGrades] = await Promise.all([
    StudentProfile.find({ user: { $in: studentIds } }).lean(),
    Attendance.find({ student: { $in: studentIds }, date: { $gte: from, $lt: to } }).lean(),
    Attendance.find({ student: { $in: studentIds } }).lean(),
    LogbookWeek.find({ student: { $in: studentIds } }).sort({ weekNumber: -1 }).lean(),
    Grade.find({ student: { $in: studentIds } }).sort({ weekNumber: -1 }).lean(),
  ]);

  // latest week per student
  const latestWeekMap = {};
  for (const w of allWeeks) {
    const sid = w.student.toString();
    if (!latestWeekMap[sid]) latestWeekMap[sid] = w;
  }

  // count entries in open weeks
  const openWeekIds = Object.values(latestWeekMap).filter((w) => !w.isLocked).map((w) => w._id);
  const openEntries = openWeekIds.length
    ? await DailyLogEntry.find({ logbookWeek: { $in: openWeekIds } }).lean()
    : [];
  const entryCount = {};
  for (const e of openEntries) {
    const wid = e.logbookWeek.toString();
    entryCount[wid] = (entryCount[wid] || 0) + 1;
  }

  return internships.map((internship) => {
    const student = internship.student;
    const sid     = student._id.toString();
    const profile = profiles.find((p) => p.user.toString() === sid);
    const today   = todayAttendance.find((a) => a.student.toString() === sid);
    const week    = latestWeekMap[sid];
    const entries = week && !week.isLocked ? (entryCount[week._id.toString()] || 0) : 0;
    const grades  = allGrades.filter((g) => g.student.toString() === sid);
    const latest  = grades[0] || null;

    const attendanceRecords  = allAttendance.filter((a) => a.student.toString() === sid);
    const presentCount       = attendanceRecords.filter((a) => ['present', 'late', 'half_day'].includes(a.status)).length;
    const totalWorkingDays   = internship.startDate ? countWorkingDays(internship.startDate, internship.endDate) : attendanceRecords.length;
    const attendanceRate     = totalWorkingDays > 0 ? Math.round((presentCount / totalWorkingDays) * 100) : 0;

    return {
      _id:                 student._id,
      name:                `${student.firstName} ${student.lastName}`,
      profileImage:        student.profileImage,
      matricNumber:        profile?.matricNumber || '',
      internshipId:        internship._id,
      company:             internship.company,
      checkedInToday:      !!today?.checkIn?.time,
      attendanceRate,
      currentWeekEntries:  entries,
      currentWeekId:       week?._id || null,
      weekNumber:          week?.weekNumber || null,
      latestGrade:         latest?.totalScore ?? null,
      supervisorScore:     latest?.supervisorScore ?? null,
    };
  });
};

// ── onboarding ─────────────────────────────────────────────────────────────────

const completeOnboarding = async (req, res) => {
  const userId = req.user._id;
  const { staffId, company, jobTitle, department, phone, officeAddress, state, lga, geofence } = req.body;

  if (!staffId?.trim() || !company?.trim()) {
    return res.status(400).json({ success: false, message: 'Staff ID and company name are required' });
  }

  const [existing, staffIdTaken] = await Promise.all([
    IndustrySupervisorProfile.findOne({ user: userId }),
    IndustrySupervisorProfile.findOne({ staffId: staffId.trim() }),
  ]);

  if (existing)     return res.status(400).json({ success: false, message: 'Onboarding already completed' });
  if (staffIdTaken) return res.status(409).json({ success: false, message: 'Staff ID already in use' });

  await IndustrySupervisorProfile.create({
    user: userId,
    staffId:       staffId.trim(),
    company:       company.trim(),
    jobTitle:      jobTitle?.trim()      || undefined,
    department:    department?.trim()    || undefined,
    phone:         phone?.trim()         || undefined,
    officeAddress: officeAddress?.trim() || undefined,
    state:         state?.trim()         || undefined,
    lga:           lga?.trim()           || undefined,
    geofence:      geofence || {},
  });

  const user = await User.findByIdAndUpdate(userId, { isOnboardingComplete: true }, { new: true });

  return res.json({
    success: true,
    data: {
      user: {
        _id: user._id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, profileImage: user.profileImage,
        isOnboardingComplete: user.isOnboardingComplete,
      },
    },
  });
};

// ── profile ────────────────────────────────────────────────────────────────────

const getProfile = async (req, res) => {
  const profile = await IndustrySupervisorProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  return res.json({ success: true, data: { profile } });
};

// ── dashboard ──────────────────────────────────────────────────────────────────

const getDashboard = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ industrySupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  const [students, conversations] = await Promise.all([
    buildStudentsData(internships),
    Conversation.find({ industrySupervisor: supervisorId })
      .populate('student', 'firstName lastName profileImage')
      .populate('institutionSupervisor', 'firstName lastName')
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const checkedInToday = students.filter((s) => s.checkedInToday).length;
  const pendingGrades  = students.filter((s) => s.supervisorScore === null && s.weekNumber !== null).length;
  const graded         = students.filter((s) => s.latestGrade !== null);
  const avgGrade       = graded.length
    ? graded.reduce((sum, s) => sum + s.latestGrade, 0) / graded.length
    : null;

  return res.json({
    success: true,
    data: {
      stats:         { totalStudents: students.length, checkedInToday, pendingGrades, avgGrade },
      students,
      conversations,
    },
  });
};

// ── my students ────────────────────────────────────────────────────────────────

const getMyStudents = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ industrySupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  const students = await buildStudentsData(internships);
  return res.json({ success: true, data: { students } });
};

// ── student logbook (read-only) ────────────────────────────────────────────────

const getStudentLogbook = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId } = req.params;

  const internship = await Internship.findOne({ student: studentId, industrySupervisor: supervisorId });
  if (!internship) return res.status(403).json({ success: false, message: 'Student not assigned to you' });

  const [studentUser, studentProfile, weeks] = await Promise.all([
    User.findById(studentId, 'firstName lastName profileImage'),
    StudentProfile.findOne({ user: studentId }),
    LogbookWeek.find({ student: studentId }).sort({ weekNumber: 1 }).lean(),
  ]);

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
        university:   studentProfile?.university  || '',
        department:   studentProfile?.department  || '',
      },
      weeks: weeksWithEntries,
    },
  });
};

// ── student profile / credentials ─────────────────────────────────────────────

const getStudentProfile = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId } = req.params;

  const internship = await Internship.findOne({ student: studentId, industrySupervisor: supervisorId });
  if (!internship) return res.status(403).json({ success: false, message: 'Student not assigned to you' });

  const [studentUser, studentProfile] = await Promise.all([
    User.findById(studentId, 'firstName lastName email profileImage').lean(),
    StudentProfile.findOne({ user: studentId }).lean(),
  ]);
  if (!studentUser) return res.status(404).json({ success: false, message: 'Student not found' });

  return res.json({
    success: true,
    data: {
      _id:                 studentUser._id,
      firstName:           studentUser.firstName,
      lastName:            studentUser.lastName,
      email:               studentUser.email,
      profileImage:        studentUser.profileImage,
      matricNumber:        studentProfile?.matricNumber  ?? null,
      university:          studentProfile?.university    ?? null,
      department:          studentProfile?.department    ?? null,
      level:               studentProfile?.level         ?? null,
      state:               studentProfile?.state         ?? null,
      lga:                 studentProfile?.lga           ?? null,
      phone:               studentProfile?.phone         ?? null,
      bio:                 studentProfile?.bio           ?? null,
      skills:              studentProfile?.skills        ?? [],
      internshipPlace:     studentProfile?.internshipPlace    ?? null,
      internshipStartDate: studentProfile?.internshipStartDate ?? null,
      internshipEndDate:   studentProfile?.internshipEndDate   ?? null,
      internshipWeeks:     studentProfile?.internshipWeeks     ?? null,
      company:             internship.company   ?? null,
      startDate:           internship.startDate ?? null,
      endDate:             internship.endDate   ?? null,
      totalWeeks:          internship.totalWeeks ?? null,
      workShift:           internship.workShift  ?? null,
    },
  });
};

// ── comment on a week ──────────────────────────────────────────────────────────

const commentOnWeek = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId, weekId } = req.params;
  const { comment } = req.body;

  if (!comment?.trim()) return res.status(400).json({ success: false, message: 'Comment is required' });

  const internship = await Internship.findOne({ student: studentId, industrySupervisor: supervisorId });
  if (!internship) return res.status(403).json({ success: false, message: 'Student not assigned to you' });

  const week = await LogbookWeek.findOneAndUpdate(
    { _id: weekId, student: studentId },
    { supervisorComment: comment.trim(), commentedAt: new Date(), commentedBy: supervisorId },
    { new: true }
  );
  if (!week) return res.status(404).json({ success: false, message: 'Logbook week not found' });

  return res.json({ success: true, data: { week } });
};

// ── grading ────────────────────────────────────────────────────────────────────

const getGradingList = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ industrySupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  if (!internships.length) return res.json({ success: true, data: { grades: [] } });

  const studentIds = internships.map((i) => i.student._id);
  const [allWeeks, grades, profiles] = await Promise.all([
    LogbookWeek.find({ student: { $in: studentIds } }).sort({ weekNumber: -1 }).lean(),
    Grade.find({ student: { $in: studentIds } }).lean(),
    StudentProfile.find({ user: { $in: studentIds } }).lean(),
  ]);

  const items = allWeeks.map((week) => {
    const internship = internships.find((i) => i.student._id.toString() === week.student.toString());
    const student    = internship?.student;
    const profile    = profiles.find((p) => p.user.toString() === week.student.toString());
    const grade      = grades.find(
      (g) => g.student.toString() === week.student.toString() && g.weekNumber === week.weekNumber
    );
    return {
      weekId:         week._id,
      weekNumber:     week.weekNumber,
      weekStartDate:  week.weekStartDate,
      weekEndDate:    week.weekEndDate,
      student: {
        _id:          student._id,
        name:         `${student.firstName} ${student.lastName}`,
        profileImage: student.profileImage,
        matricNumber: profile?.matricNumber || '',
      },
      systemScore:    grade?.systemScore    ?? null,
      supervisorScore: grade?.supervisorScore ?? null,
      totalScore:     grade?.totalScore     ?? null,
      supervisorNote: grade?.supervisorNote ?? '',
      isGraded:       grade?.supervisorScore !== null && grade?.supervisorScore !== undefined,
    };
  });

  return res.json({ success: true, data: { grades: items } });
};

const getStudentGrades = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId } = req.params;

  const internship = await Internship.findOne({ student: studentId, industrySupervisor: supervisorId });
  if (!internship) return res.status(403).json({ success: false, message: 'Student not assigned to you' });

  const grades = await Grade.find({ student: studentId }).sort({ weekNumber: 1 }).lean();
  return res.json({ success: true, data: { grades } });
};

const submitGrade = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId, weekId } = req.params;
  const { supervisorScore, supervisorNote } = req.body;

  if (supervisorScore === undefined || supervisorScore === null) {
    return res.status(400).json({ success: false, message: 'supervisorScore is required' });
  }
  const score = Number(supervisorScore);
  if (isNaN(score) || score < 0 || score > 50) {
    return res.status(400).json({ success: false, message: 'supervisorScore must be 0–50' });
  }

  const [internship, week] = await Promise.all([
    Internship.findOne({ student: studentId, industrySupervisor: supervisorId }),
    LogbookWeek.findOne({ _id: weekId, student: studentId }),
  ]);
  if (!internship) return res.status(403).json({ success: false, message: 'Student not assigned to you' });
  if (!week)       return res.status(404).json({ success: false, message: 'Logbook week not found' });

  let grade = await Grade.findOne({ student: studentId, weekNumber: week.weekNumber });
  if (!grade) {
    grade = new Grade({
      student:     studentId,
      internship:  internship._id,
      logbookWeek: weekId,
      weekNumber:  week.weekNumber,
    });
  }

  // If the Saturday cron hasn't run yet, calculate system score now
  if (!grade.isSystemCalculated) {
    const [entries, attendance] = await Promise.all([
      DailyLogEntry.find({ logbookWeek: weekId }),
      Attendance.find({
        student: studentId,
        date:    { $gte: week.weekStartDate, $lte: week.weekEndDate },
      }),
    ]);
    const { attendanceScore, logbookScore, systemScore } = calcSystemScore(attendance, entries);
    grade.attendanceScore    = attendanceScore;
    grade.logbookScore       = logbookScore;
    grade.systemScore        = systemScore;
    grade.isSystemCalculated = true;
  }

  grade.supervisorScore = score;
  grade.supervisorNote  = supervisorNote?.trim() || null;
  grade.gradedBy        = supervisorId;
  grade.gradedAt        = new Date();
  grade.totalScore      = grade.systemScore + score;

  await grade.save();
  return res.json({ success: true, data: { grade } });
};

module.exports = {
  completeOnboarding, getProfile, getDashboard, getMyStudents,
  getStudentLogbook, getStudentProfile, commentOnWeek,
  getGradingList, getStudentGrades, submitGrade,
};
