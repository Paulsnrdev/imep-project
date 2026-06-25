const InstitutionSupervisorProfile = require('../models/InstitutionSupervisorProfile');
const IndustrySupervisorProfile    = require('../models/IndustrySupervisorProfile');
const Internship    = require('../models/Internship');
const Attendance    = require('../models/Attendance');
const LogbookWeek   = require('../models/LogbookWeek');
const DailyLogEntry = require('../models/DailyLogEntry');
const Grade         = require('../models/Grade');
const StudentProfile = require('../models/StudentProfile');
const Conversation  = require('../models/Conversation');
const User          = require('../models/user');
const countWorkingDays = require('../utils/countWorkingDays');

// ── onboarding ─────────────────────────────────────────────────────────────────

const completeOnboarding = async (req, res) => {
  const userId = req.user._id;
  const { staffId, university, department, phone, officeAddress, state, lga } = req.body;

  if (!staffId?.trim() || !university?.trim()) {
    return res.status(400).json({ success: false, message: 'Staff ID and university are required' });
  }

  const [existing, staffIdTaken] = await Promise.all([
    InstitutionSupervisorProfile.findOne({ user: userId }),
    InstitutionSupervisorProfile.findOne({ staffId: staffId.trim() }),
  ]);

  if (existing)     return res.status(400).json({ success: false, message: 'Onboarding already completed' });
  if (staffIdTaken) return res.status(409).json({ success: false, message: 'Staff ID already in use' });

  await InstitutionSupervisorProfile.create({
    user: userId,
    staffId:       staffId.trim(),
    university:    university.trim(),
    department:    department?.trim()    || undefined,
    phone:         phone?.trim()         || undefined,
    officeAddress: officeAddress?.trim() || undefined,
    state:         state?.trim()         || undefined,
    lga:           lga?.trim()           || undefined,
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
  const profile = await InstitutionSupervisorProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
  return res.json({ success: true, data: { profile } });
};

// ── shared helper ──────────────────────────────────────────────────────────────

const buildStudentsData = async (internships) => {
  if (!internships.length) return [];

  const studentIds = internships.map((i) => i.student._id);

  const WAT       = 60 * 60 * 1000;
  const watNow    = new Date(Date.now() + WAT);
  watNow.setUTCHours(0, 0, 0, 0);
  const todayStart = new Date(watNow.getTime() - WAT);
  const todayEnd   = new Date(todayStart.getTime() + 86400000);

  const [profiles, allGrades, allAttendance, allWeeks, todayAttendance] = await Promise.all([
    StudentProfile.find({ user: { $in: studentIds } }).lean(),
    Grade.find({ student: { $in: studentIds } }).lean(),
    Attendance.find({ student: { $in: studentIds } }).lean(),
    LogbookWeek.find({ student: { $in: studentIds } }).sort({ weekNumber: -1 }).lean(),
    Attendance.find({ student: { $in: studentIds }, date: { $gte: todayStart, $lt: todayEnd } }).lean(),
  ]);

  // latest week per student
  const latestWeekMap = {};
  for (const w of allWeeks) {
    const sid = w.student.toString();
    if (!latestWeekMap[sid]) latestWeekMap[sid] = w;
  }

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

    // avg score from all graded weeks
    const studentGrades = allGrades.filter((g) => g.student.toString() === sid && g.totalScore != null);
    const avgScore = studentGrades.length
      ? studentGrades.reduce((sum, g) => sum + g.totalScore, 0) / studentGrades.length
      : null;

    // attendance rate — use actual Mon–Fri days elapsed, not just days with records
    const attendanceRecords = allAttendance.filter((a) => a.student.toString() === sid);
    const presentCount = attendanceRecords.filter((a) =>
      ['present', 'late', 'half_day'].includes(a.status)
    ).length;
    const totalWorkingDays = internship.startDate
      ? countWorkingDays(internship.startDate, internship.endDate)
      : attendanceRecords.length;
    const attendanceRate = totalWorkingDays > 0
      ? Math.round((presentCount / totalWorkingDays) * 100)
      : 0;

    // logbook completion (current week)
    const week  = latestWeekMap[sid];
    const count = week && !week.isLocked ? (entryCount[week._id.toString()] || 0) : 0;
    const logbookRate = Math.round((count / 5) * 100);

    const todayRecord   = todayAttendance.find((a) => a.student.toString() === sid);
    const checkedInToday = !!todayRecord?.checkIn?.time;

    return {
      _id:                     student._id,
      name:                    `${student.firstName} ${student.lastName}`,
      profileImage:            student.profileImage,
      matricNumber:            profile?.matricNumber || '',
      company:                 internship.company,
      avgScore,
      attendanceRate,
      logbookRate,
      checkedInToday,
      weekNumber:              week?.weekNumber || null,
      internshipId:            internship._id,
      nominatedSupervisorInfo: internship.nominatedSupervisorInfo || null,
    };
  });
};

// ── dashboard ──────────────────────────────────────────────────────────────────

const getDashboard = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ institutionSupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  const [students, conversations] = await Promise.all([
    buildStudentsData(internships),
    Conversation.find({ institutionSupervisor: supervisorId })
      .populate('student', 'firstName lastName profileImage')
      .populate('industrySupervisor', 'firstName lastName')
      .sort({ lastMessageAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const totalStudents = students.length;
  const withGrade     = students.filter((s) => s.avgScore !== null);
  const avgScore      = withGrade.length
    ? withGrade.reduce((sum, s) => sum + s.avgScore, 0) / withGrade.length
    : null;
  const avgAttendance = totalStudents
    ? Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents)
    : 0;
  const weeklySubmitted = students.filter((s) => s.logbookRate === 100).length;

  return res.json({
    success: true,
    data: {
      stats:         { totalStudents, avgScore, avgAttendance, weeklySubmitted },
      students,
      conversations,
    },
  });
};

// ── my students ────────────────────────────────────────────────────────────────

const getMyStudents = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ institutionSupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  const students = await buildStudentsData(internships);
  return res.json({ success: true, data: { students } });
};

// ── student logbook (read-only) ────────────────────────────────────────────────

const getStudentLogbook = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId } = req.params;

  const internship = await Internship.findOne({ student: studentId, institutionSupervisor: supervisorId });
  if (!internship) return res.status(403).json({ success: false, message: 'Student not assigned to you' });

  // Fetch industry supervisor info if the student is already linked to one
  let industrySupervisorInfo = null;
  if (internship.industrySupervisor) {
    const [isUser, isProfile] = await Promise.all([
      User.findById(internship.industrySupervisor, 'firstName lastName email profileImage').lean(),
      IndustrySupervisorProfile.findOne({ user: internship.industrySupervisor }).lean(),
    ]);
    if (isUser) {
      industrySupervisorInfo = {
        _id:          isUser._id,
        name:         `${isUser.firstName} ${isUser.lastName}`,
        email:        isUser.email,
        profileImage: isUser.profileImage,
        company:      isProfile?.company    ?? null,
        jobTitle:     isProfile?.jobTitle   ?? null,
        department:   isProfile?.department ?? null,
        phone:        isProfile?.phone      ?? null,
        staffId:      isProfile?.staffId    ?? null,
      };
    }
  }

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
      industrySupervisor:    industrySupervisorInfo,
      nominatedSupervisorInfo: internship.nominatedSupervisorInfo?.name
        ? internship.nominatedSupervisorInfo
        : null,
      weeks: weeksWithEntries,
    },
  });
};

// ── student profile / credentials ─────────────────────────────────────────────

const getStudentProfile = async (req, res) => {
  const supervisorId = req.user._id;
  const { studentId } = req.params;

  const internship = await Internship.findOne({ student: studentId, institutionSupervisor: supervisorId });
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
      matricNumber:        studentProfile?.matricNumber       ?? null,
      university:          studentProfile?.university         ?? null,
      department:          studentProfile?.department         ?? null,
      level:               studentProfile?.level              ?? null,
      state:               studentProfile?.state              ?? null,
      lga:                 studentProfile?.lga                ?? null,
      phone:               studentProfile?.phone              ?? null,
      bio:                 studentProfile?.bio                ?? null,
      skills:              studentProfile?.skills             ?? [],
      internshipPlace:     studentProfile?.internshipPlace    ?? null,
      internshipStartDate: studentProfile?.internshipStartDate ?? null,
      internshipEndDate:   studentProfile?.internshipEndDate   ?? null,
      internshipWeeks:     studentProfile?.internshipWeeks     ?? null,
      company:             internship.company    ?? null,
      startDate:           internship.startDate  ?? null,
      endDate:             internship.endDate    ?? null,
      totalWeeks:          internship.totalWeeks ?? null,
      workShift:           internship.workShift  ?? null,
    },
  });
};

// ── grades overview ────────────────────────────────────────────────────────────

const getGradesOverview = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ institutionSupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  if (!internships.length) return res.json({ success: true, data: { students: [] } });

  const studentIds = internships.map((i) => i.student._id);

  const [profiles, allGrades, allWeeks] = await Promise.all([
    StudentProfile.find({ user: { $in: studentIds } }).lean(),
    Grade.find({ student: { $in: studentIds } }).sort({ weekNumber: 1 }).lean(),
    LogbookWeek.find({ student: { $in: studentIds } }).lean(),
  ]);

  const weekMap = {};
  for (const w of allWeeks) weekMap[w._id.toString()] = w;

  const students = internships.map((internship) => {
    const student = internship.student;
    const sid     = student._id.toString();
    const profile = profiles.find((p) => p.user.toString() === sid);
    const grades  = allGrades
      .filter((g) => g.student.toString() === sid)
      .map((g) => {
        const week = weekMap[g.logbookWeek?.toString()];
        return {
          _id:             g._id,
          weekNumber:      g.weekNumber,
          weekStartDate:   week?.weekStartDate,
          weekEndDate:     week?.weekEndDate,
          systemScore:     g.systemScore,
          supervisorScore: g.supervisorScore,
          totalScore:      g.totalScore,
          supervisorNote:  g.supervisorNote,
          isGraded:        g.supervisorScore !== null && g.supervisorScore !== undefined,
        };
      });

    const graded   = grades.filter((g) => g.totalScore !== null);
    const avgScore = graded.length
      ? graded.reduce((s, g) => s + g.totalScore, 0) / graded.length
      : null;

    return {
      _id:          student._id,
      name:         `${student.firstName} ${student.lastName}`,
      profileImage: student.profileImage,
      matricNumber: profile?.matricNumber || '',
      company:      internship.company,
      avgScore,
      totalGraded:  graded.length,
      grades,
    };
  });

  return res.json({ success: true, data: { students } });
};

// ── leaderboard ────────────────────────────────────────────────────────────────

const getLeaderboard = async (req, res) => {
  const supervisorId = req.user._id;

  const internships = await Internship.find({ institutionSupervisor: supervisorId, isActive: true })
    .populate('student', 'firstName lastName profileImage');

  if (!internships.length) return res.json({ success: true, data: { leaderboard: [] } });

  const studentIds = internships.map((i) => i.student._id);

  const [profiles, allGrades, allAttendance] = await Promise.all([
    StudentProfile.find({ user: { $in: studentIds } }).lean(),
    Grade.find({ student: { $in: studentIds } }).lean(),
    Attendance.find({ student: { $in: studentIds } }).lean(),
  ]);

  const ranked = internships
    .map((internship) => {
      const student = internship.student;
      const sid     = student._id.toString();
      const profile = profiles.find((p) => p.user.toString() === sid);

      const grades        = allGrades.filter((g) => g.student.toString() === sid && g.totalScore !== null);
      const avgScore      = grades.length
        ? grades.reduce((s, g) => s + g.totalScore, 0) / grades.length
        : null;

      const attendance    = allAttendance.filter((a) => a.student.toString() === sid);
      const presentCount  = attendance.filter((a) => ['present', 'late'].includes(a.status)).length;
      const attendanceRate = attendance.length
        ? Math.round((presentCount / attendance.length) * 100)
        : 0;

      return {
        _id:            student._id,
        name:           `${student.firstName} ${student.lastName}`,
        profileImage:   student.profileImage,
        matricNumber:   profile?.matricNumber || '',
        company:        internship.company,
        avgScore,
        totalGraded:    grades.length,
        attendanceRate,
      };
    })
    .sort((a, b) => {
      // null avgScore goes to the bottom
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return b.avgScore - a.avgScore;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return res.json({ success: true, data: { leaderboard: ranked } });
};

// ── search students without industry supervisor (for linking) ──────────────────

const searchUnassignedStudents = async (req, res) => {
  const supervisorId = req.user._id;
  const { q = '' }  = req.query;
  const term        = q.trim().toLowerCase();

  // Students assigned to this institution supervisor who don't have an industry supervisor yet
  const internships = await Internship.find({
    institutionSupervisor: supervisorId,
    isActive:              true,
    industrySupervisor:    null,
  })
    .populate('student', 'firstName lastName email profileImage')
    .lean();

  const profiles = await StudentProfile.find({
    user: { $in: internships.map((i) => i.student._id) },
  }).lean();

  const profileMap = {};
  for (const p of profiles) profileMap[p.user.toString()] = p;

  const filtered = internships.filter((i) => {
    if (!term) return true;
    const name = `${i.student.firstName} ${i.student.lastName}`.toLowerCase();
    const profile = profileMap[i.student._id.toString()];
    return (
      name.includes(term) ||
      profile?.matricNumber?.toLowerCase().includes(term) ||
      profile?.university?.toLowerCase().includes(term)
    );
  });

  const students = filtered.slice(0, 20).map((i) => {
    const profile = profileMap[i.student._id.toString()];
    return {
      _id:                     i.student._id,
      internshipId:            i._id,
      name:                    `${i.student.firstName} ${i.student.lastName}`,
      email:                   i.student.email,
      profileImage:            i.student.profileImage,
      matricNumber:            profile?.matricNumber || '',
      university:              profile?.university   || '',
      department:              profile?.department   || '',
      company:                 i.company             || '',
      nominatedSupervisorInfo: i.nominatedSupervisorInfo || null,
    };
  });

  return res.json({ success: true, data: { students } });
};

// ── search industry supervisors ────────────────────────────────────────────────

const searchIndustrySupervisors = async (req, res) => {
  const { q = '' } = req.query;
  const term = q.trim().toLowerCase();

  const profiles = await IndustrySupervisorProfile.find({})
    .populate('user', 'firstName lastName email profileImage')
    .lean();

  const filtered = term
    ? profiles.filter((p) => {
        const name = `${p.user.firstName} ${p.user.lastName}`.toLowerCase();
        return (
          name.includes(term) ||
          p.company?.toLowerCase().includes(term) ||
          p.staffId?.toLowerCase().includes(term)
        );
      })
    : profiles;

  const supervisors = filtered.slice(0, 20).map((p) => ({
    _id:          p.user._id,
    name:         `${p.user.firstName} ${p.user.lastName}`,
    email:        p.user.email,
    profileImage: p.user.profileImage,
    company:      p.company,
    jobTitle:     p.jobTitle,
    department:   p.department,
    staffId:      p.staffId,
  }));

  return res.json({ success: true, data: { supervisors } });
};

// ── link industry supervisor to existing internship ────────────────────────────

const createInternshipAssignment = async (req, res) => {
  const institutionSupervisorId = req.user._id;
  const { studentId, industrySupervisorId, company, department, startDate, endDate, totalWeeks } = req.body;

  if (!studentId || !industrySupervisorId) {
    return res.status(400).json({ success: false, message: 'Student and industry supervisor are required' });
  }

  // Find the internship that was auto-created during student onboarding and set the industry supervisor
  const updateFields = { industrySupervisor: industrySupervisorId };
  if (company)    updateFields.company    = company.trim();
  if (department) updateFields.department = department.trim();
  if (startDate)  updateFields.startDate  = new Date(startDate);
  if (endDate)    updateFields.endDate    = new Date(endDate);
  if (totalWeeks) updateFields.totalWeeks = Number(totalWeeks);

  const internship = await Internship.findOneAndUpdate(
    { student: studentId, institutionSupervisor: institutionSupervisorId, isActive: true },
    { $set: updateFields },
    { new: true }
  );

  if (!internship) {
    return res.status(404).json({ success: false, message: 'No internship found for this student under your supervision' });
  }

  // Create conversation thread between all parties
  const existingConv = await Conversation.findOne({ internship: internship._id });
  if (!existingConv) {
    await Conversation.create({
      internship:            internship._id,
      student:               studentId,
      industrySupervisor:    industrySupervisorId,
      institutionSupervisor: institutionSupervisorId,
    });
  }

  return res.json({ success: true, data: { internship } });
};

module.exports = {
  completeOnboarding, getProfile, getDashboard, getMyStudents, getStudentLogbook, getStudentProfile,
  getGradesOverview, getLeaderboard,
  searchUnassignedStudents, searchIndustrySupervisors, createInternshipAssignment,
};
