const asyncHandler        = require('../utils/asyncHandler');
const StudentProfile      = require('../models/StudentProfile');
const User                = require('../models/user');
const Internship          = require('../models/Internship');
const Attendance          = require('../models/Attendance');
const LogbookWeek         = require('../models/LogbookWeek');
const DailyLogEntry       = require('../models/DailyLogEntry');
const Grade               = require('../models/Grade');
const Notification        = require('../models/Notification');
const IndustrySupervisorProfile = require('../models/IndustrySupervisorProfile');
const { allocateInstitutionSupervisor } = require('../services/supervisorAllocation.service');
const countWorkingDays                  = require('../utils/countWorkingDays');

// POST /api/student/onboarding
exports.completeOnboarding = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const existing = await StudentProfile.findOne({ user: userId });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Onboarding already completed.' });
  }

  const {
    matricNumber, university, department, level,
    state, lga,
    phone, bio, skills,
    internshipPlace, internshipStartDate, internshipEndDate, internshipWeeks, workShift,
  } = req.body;

  if (!matricNumber || !university || !department || !level) {
    return res.status(400).json({
      success: false,
      message: 'Matric number, university, department and level are required.',
    });
  }

  const VALID_WEEKS = [12, 24, 48, 52];
  if (internshipWeeks && !VALID_WEEKS.includes(Number(internshipWeeks))) {
    return res.status(400).json({
      success: false,
      message: 'internshipWeeks must be 12, 24, 48 or 52.',
    });
  }

  const duplicate = await StudentProfile.findOne({ matricNumber });
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: 'A student with this matric number already exists.',
    });
  }

  await StudentProfile.create({
    user:                userId,
    matricNumber:        matricNumber.trim(),
    university:          university.trim(),
    department:          department.trim(),
    level,
    state:               state?.trim(),
    lga:                 lga?.trim(),
    phone:               phone?.trim(),
    bio:                 bio?.trim(),
    skills:              Array.isArray(skills) ? skills : [],
    internshipPlace:     internshipPlace?.trim(),
    internshipStartDate: internshipStartDate ? new Date(internshipStartDate) : undefined,
    internshipEndDate:   internshipEndDate   ? new Date(internshipEndDate)   : undefined,
    internshipWeeks:     internshipWeeks     ? Number(internshipWeeks)       : undefined,
  });

  // Auto-allocate institution supervisor based on LGA/state match
  const allocatedSupervisorId = await allocateInstitutionSupervisor(userId);

  // Always create the internship record — supervisor can be null if none are available yet
  // and will be assigned later via re-allocation or admin action.
  const internshipData = {
    student:               userId,
    institutionSupervisor: allocatedSupervisorId || null,
  };
  if (internshipPlace)     internshipData.company    = internshipPlace.trim();
  if (internshipStartDate) internshipData.startDate  = new Date(internshipStartDate);
  if (internshipEndDate)   internshipData.endDate    = new Date(internshipEndDate);
  if (internshipWeeks)     internshipData.totalWeeks = Number(internshipWeeks);
  if (workShift && ['8-16','9-17'].includes(workShift)) internshipData.workShift = workShift;
  const newInternship = await Internship.create(internshipData);

  // Always create week 1 immediately so the student can start writing
  const now    = new Date();
  const dotw   = now.getDay();
  const monday = new Date(now);
  if      (dotw === 0) monday.setDate(now.getDate() + 1);
  else if (dotw === 6) monday.setDate(now.getDate() + 2);
  else                 monday.setDate(now.getDate() - (dotw - 1));
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  let weekOneOffset = 0;
  if (internshipStartDate) {
    const s = new Date(internshipStartDate);
    s.setHours(0, 0, 0, 0);
    if (s.getTime() > monday.getTime()) {
      weekOneOffset = Math.min(Math.round((s.getTime() - monday.getTime()) / 86400000), 4);
    }
  }

  await LogbookWeek.create({
    internship:     newInternship._id,
    student:        userId,
    weekNumber:     1,
    weekStartDate:  monday,
    weekEndDate:    friday,
    isLocked:       false,
    startDayOffset: weekOneOffset,
  });

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { isOnboardingComplete: true },
    { new: true }
  );

  res.json({
    success: true,
    data: {
      user: {
        _id:                  updatedUser._id,
        firstName:            updatedUser.firstName,
        lastName:             updatedUser.lastName,
        email:                updatedUser.email,
        role:                 updatedUser.role,
        profileImage:         updatedUser.profileImage,
        isOnboardingComplete: true,
      },
      onboardingComplete: true,
    },
  });
});

// GET /api/student/dashboard
exports.getMyDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [profile, internship, notifications] = await Promise.all([
    StudentProfile.findOne({ user: userId }).lean(),
    Internship.findOne({ student: userId, isActive: true })
      .populate('industrySupervisor',    'firstName lastName profileImage')
      .populate('institutionSupervisor', 'firstName lastName profileImage')
      .lean(),
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  if (!internship) {
    // Fallback: try to get the allocated institution supervisor from the student profile
    let institutionSupervisor = null;
    if (profile?.allocatedInstitutionSupervisor) {
      institutionSupervisor = await User.findById(
        profile.allocatedInstitutionSupervisor,
        'firstName lastName profileImage'
      ).lean();
    }
    return res.json({
      success: true,
      data: {
        profile,
        internship:        null,
        supervisors:       institutionSupervisor ? { industry: null, institution: institutionSupervisor } : null,
        todayAttendance:   null,
        attendanceSummary: { presentDays: 0, totalWorkingDays: 0 },
        currentWeek:       null,
        grades:            [],
        notifications,
      },
    });
  }

  const now        = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const internshipId = internship._id.toString();

  const [todayAttendance, allAttendance, latestWeek, grades, rawInternship] = await Promise.all([
    Attendance.findOne({ student: userId, date: { $gte: todayStart, $lte: todayEnd } }).lean(),
    Attendance.find({ student: userId }).lean(),
    LogbookWeek.findOne({ student: userId }).sort({ weekNumber: -1 }).lean(),
    Grade.find({ student: userId }).sort({ weekNumber: 1 }).lean(),
    Internship.findOne({ student: userId, isActive: true }).lean(),
  ]);

  // Filter to this internship using string comparison to avoid lean()+ObjectId mismatch
  const internshipAttendance = allAttendance.filter(
    (a) => a.internship && a.internship.toString() === internshipId
  );

  const presentCount     = internshipAttendance.filter((a) => ['present', 'late'].includes(a.status)).length;
  const totalWorkingDays = rawInternship?.startDate
    ? countWorkingDays(rawInternship.startDate, rawInternship.endDate)
    : internshipAttendance.length;
  const attendanceSummary = { presentDays: presentCount, totalWorkingDays };

  let currentWeek = null;
  if (latestWeek) {
    const ORDER   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const entries = await DailyLogEntry.find({ logbookWeek: latestWeek._id }).lean();
    currentWeek   = {
      ...latestWeek,
      entries: entries.sort((a, b) => ORDER.indexOf(a.dayOfWeek) - ORDER.indexOf(b.dayOfWeek)),
    };
  }

  return res.json({
    success: true,
    data: {
      profile,
      internship: {
        _id:                     internship._id,
        company:                 internship.company,
        department:              internship.department,
        startDate:               internship.startDate,
        endDate:                 internship.endDate,
        totalWeeks:              internship.totalWeeks,
        status:                  internship.status,
        nominatedSupervisorInfo: internship.nominatedSupervisorInfo || null,
      },
      supervisors: {
        industry:    internship.industrySupervisor    || null,
        institution: internship.institutionSupervisor || null,
      },
      todayAttendance,
      attendanceSummary,
      currentWeek,
      grades,
      notifications,
    },
  });
});

// GET /api/student/grades
exports.getMyGrades = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const grades = await Grade.find({ student: userId }).sort({ weekNumber: 1 }).lean();

  const weekIds = grades.map((g) => g.logbookWeek).filter(Boolean);
  const weeks   = weekIds.length
    ? await LogbookWeek.find({ _id: { $in: weekIds } }).lean()
    : [];

  const enriched = grades.map((g) => {
    const week = weeks.find((w) => w._id.toString() === g.logbookWeek?.toString());
    return {
      _id:                g._id,
      weekNumber:         g.weekNumber,
      weekStartDate:      week?.weekStartDate,
      weekEndDate:        week?.weekEndDate,
      attendanceScore:    g.attendanceScore,
      logbookScore:       g.logbookScore,
      systemScore:        g.systemScore,
      supervisorScore:    g.supervisorScore,
      supervisorNote:     g.supervisorNote,
      totalScore:         g.totalScore,
      isSystemCalculated: g.isSystemCalculated,
      isGraded:           g.totalScore !== null,
    };
  });

  const graded   = enriched.filter((g) => g.totalScore !== null);
  const avgScore = graded.length
    ? graded.reduce((s, g) => s + g.totalScore, 0) / graded.length
    : null;

  return res.json({
    success: true,
    data: {
      grades: enriched,
      summary: {
        totalGraded:  graded.length,
        avgScore,
        highestScore: graded.length ? Math.max(...graded.map((g) => g.totalScore)) : null,
        lowestScore:  graded.length ? Math.min(...graded.map((g) => g.totalScore)) : null,
      },
    },
  });
});

// GET /api/student/profile
exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found.' });
  }
  res.json({ success: true, data: profile });
});

// GET /api/student/search/supervisors?q=
exports.searchIndustrySupervisors = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  const term = q.trim().toLowerCase();

  if (!term) return res.json({ success: true, data: { supervisors: [] } });

  const profiles = await IndustrySupervisorProfile.find({})
    .populate('user', 'firstName lastName email profileImage')
    .lean();

  const filtered = profiles.filter((p) => {
    const name = `${p.user.firstName} ${p.user.lastName}`.toLowerCase();
    return (
      name.includes(term) ||
      p.company?.toLowerCase().includes(term) ||
      p.staffId?.toLowerCase().includes(term)
    );
  });

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
});

// GET /api/student/work-location
exports.getWorkLocation = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id }).lean();
  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
  return res.json({ success: true, data: profile.workLocation ?? null });
});

// POST /api/student/work-location
exports.registerWorkLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, address } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ success: false, message: 'latitude and longitude are required.' });
  }

  const profile = await StudentProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        'workLocation.latitude':     Number(latitude),
        'workLocation.longitude':    Number(longitude),
        'workLocation.address':      address?.trim() || null,
        'workLocation.registeredAt': new Date(),
      },
    },
    { new: true }
  );

  if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

  return res.json({ success: true, data: profile.workLocation });
});

// POST /api/student/nominate-supervisor
exports.nominateSupervisor = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { supervisorId, name, email, phone, company, jobTitle } = req.body;

  if (!supervisorId && !name?.trim()) {
    return res.status(400).json({ success: false, message: 'Supervisor name or selection is required.' });
  }

  const internship = await Internship.findOne({ student: userId, isActive: true });
  if (!internship) {
    return res.status(404).json({ success: false, message: 'No active internship found. Complete onboarding first.' });
  }

  const nominatedInfo = {
    userId:      supervisorId || null,
    name:        name?.trim()     || null,
    email:       email?.trim()    || null,
    phone:       phone?.trim()    || null,
    company:     company?.trim()  || null,
    jobTitle:    jobTitle?.trim() || null,
    nominatedAt: new Date(),
  };

  // If a registered supervisor was selected, fill details from their profile
  if (supervisorId) {
    const profile = await IndustrySupervisorProfile.findOne({ user: supervisorId })
      .populate('user', 'firstName lastName email');
    if (profile) {
      nominatedInfo.name    = `${profile.user.firstName} ${profile.user.lastName}`;
      nominatedInfo.email   = profile.user.email;
      if (!nominatedInfo.company)  nominatedInfo.company  = profile.company  || null;
      if (!nominatedInfo.jobTitle) nominatedInfo.jobTitle = profile.jobTitle || null;
    }
  }

  await Internship.findByIdAndUpdate(internship._id, { $set: { nominatedSupervisorInfo: nominatedInfo } });

  return res.json({ success: true, data: { nominatedSupervisorInfo: nominatedInfo } });
});
