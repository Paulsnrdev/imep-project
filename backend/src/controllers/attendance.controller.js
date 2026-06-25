const asyncHandler              = require('../utils/asyncHandler');
const Attendance                = require('../models/Attendance');
const Internship                = require('../models/Internship');
const IndustrySupervisorProfile = require('../models/IndustrySupervisorProfile');
const StudentProfile            = require('../models/StudentProfile');
const User                      = require('../models/user');
const calculateDistance         = require('../utils/calculateDistance');
const countWorkingDays          = require('../utils/countWorkingDays');
const { sendNotification }      = require('../services/notification.service');

const WAT_OFFSET_MS  = 60 * 60 * 1000; // UTC+1
const DEFAULT_RADIUS = 200;            // metres

// Derives check-in deadline and early-checkout threshold from workShift ('8-16' | '9-17')
const getWorkHours = (workShift) => {
  const [startH, endH] = (workShift || '8-16').split('-').map(Number);
  return {
    startH,
    endH,
    checkInDeadlineH:  startH,   // late if after startH:30
    checkInDeadlineM:  30,
    checkOutEarliestH: endH - 1, // early if before (endH-1):30
    checkOutEarliestM: 30,
  };
};

const todayBounds = () => {
  const now   = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end   = new Date(now); end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Returns { h, m } in WAT (UTC+1)
const watTime = (date) => {
  const d = new Date(new Date(date).getTime() + WAT_OFFSET_MS);
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
};

const isLateCheckIn = (date, dH, dM) => {
  const { h, m } = watTime(date);
  return h > dH || (h === dH && m > dM);
};

const isEarlyCheckOut = (date, eH, eM) => {
  const { h, m } = watTime(date);
  return h < eH || (h === eH && m < eM);
};

// ── GET /api/attendance/today ─────────────────────────────────────────────────
exports.getToday = asyncHandler(async (req, res) => {
  const { start, end } = todayBounds();
  const record = await Attendance.findOne({
    student: req.user._id,
    date: { $gte: start, $lte: end },
  }).lean();

  res.json({ success: true, data: record ?? null });
});

// ── GET /api/attendance/history?limit=10 ─────────────────────────────────────
exports.getHistory = asyncHandler(async (req, res) => {
  const limit   = Math.min(parseInt(req.query.limit) || 10, 50);
  const records = await Attendance.find({ student: req.user._id })
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  res.json({ success: true, data: records });
});

// ── GET /api/attendance/summary ───────────────────────────────────────────────
exports.getSummary = asyncHandler(async (req, res) => {
  const internship = await Internship.findOne({ student: req.user._id, isActive: true });
  if (!internship) {
    return res.json({
      success: true,
      data: {
        presentDays: 0, absentDays: 0, lateDays: 0,
        earlyDepartures: 0, totalWorkingDays: 0, attendanceRate: 0,
        averageCheckIn: null, averageWorkingHours: null,
      },
    });
  }

  const records = await Attendance.find({
    student:    req.user._id,
    internship: internship._id,
  }).lean();

  const presentDays     = records.filter((r) => ['present', 'late'].includes(r.status)).length;
  const lateDays        = records.filter((r) => r.checkIn?.isLate).length;
  const earlyDepartures = records.filter((r) => r.checkOut?.isEarlyDeparture).length;

  // Total working days = Mon–Fri days elapsed since internship start (not just days with records)
  const totalWorkingDays = internship.startDate
    ? countWorkingDays(internship.startDate, internship.endDate)
    : records.length;

  const checkInTimes = records
    .filter((r) => r.checkIn?.time)
    .map((r) => {
      const { h, m } = watTime(r.checkIn.time);
      return h * 60 + m;
    });
  const avgCheckInMins = checkInTimes.length
    ? Math.round(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length)
    : null;
  const averageCheckIn = avgCheckInMins != null
    ? `${String(Math.floor(avgCheckInMins / 60)).padStart(2, '0')}:${String(avgCheckInMins % 60).padStart(2, '0')}`
    : null;

  const workingHoursList = records
    .filter((r) => r.checkIn?.time && r.checkOut?.time)
    .map((r) => (new Date(r.checkOut.time) - new Date(r.checkIn.time)) / 3_600_000);
  const averageWorkingHours = workingHoursList.length
    ? Math.round((workingHoursList.reduce((a, b) => a + b, 0) / workingHoursList.length) * 10) / 10
    : null;

  const { startH, endH } = getWorkHours(internship.workShift);

  res.json({
    success: true,
    data: {
      presentDays,
      absentDays:    Math.max(0, totalWorkingDays - presentDays),
      lateDays,
      earlyDepartures,
      totalWorkingDays,
      attendanceRate: totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0,
      averageCheckIn,
      averageWorkingHours,
      workShift:  internship.workShift || '8-16',
      workStartH: startH,
      workEndH:   endH,
    },
  });
});

// ── POST /api/attendance/checkin ──────────────────────────────────────────────
exports.checkIn = asyncHandler(async (req, res) => {
  const { latitude, longitude, violationReason } = req.body;

  if (latitude == null || longitude == null) {
    return res.status(400).json({ success: false, message: 'GPS coordinates are required.' });
  }

  const [internship, studentProfile] = await Promise.all([
    Internship.findOne({ student: req.user._id, isActive: true }),
    StudentProfile.findOne({ user: req.user._id }).lean(),
  ]);

  if (!internship) {
    return res.status(403).json({ success: false, message: 'You have not been linked to an active internship yet.' });
  }

  const { start, end } = todayBounds();
  const existing = await Attendance.findOne({ student: req.user._id, date: { $gte: start, $lte: end } });
  if (existing?.checkIn?.time) {
    return res.status(409).json({ success: false, message: 'You have already checked in today.' });
  }

  // Geofence validation — use student's registered workLocation first, fall back to supervisor geofence
  let isGeofenceViolation = false;
  const wl = studentProfile?.workLocation;
  if (wl?.latitude != null) {
    const distance = Math.round(calculateDistance(latitude, longitude, wl.latitude, wl.longitude));
    const radius   = wl.radius ?? DEFAULT_RADIUS;
    if (distance > radius) {
      isGeofenceViolation = true;
      return res.status(422).json({
        success: false,
        message: `You are ${distance}m from your registered work location (limit: ${radius}m). Check-in blocked.`,
        data: { requiresReason: false, distanceFromOffice: distance, radius, code: 'GEOFENCE_VIOLATION' },
      });
    }
  } else if (internship.industrySupervisor) {
    const supervisorProfile = await IndustrySupervisorProfile.findOne({ user: internship.industrySupervisor });
    if (supervisorProfile?.geofence?.latitude) {
      const { latitude: gLat, longitude: gLon, radius = DEFAULT_RADIUS } = supervisorProfile.geofence;
      const distance = Math.round(calculateDistance(latitude, longitude, gLat, gLon));
      if (distance > radius) {
        isGeofenceViolation = true;
        return res.status(422).json({
          success: false,
          message: `You are ${distance}m from your workplace (limit: ${radius}m). Check-in blocked.`,
          data: { requiresReason: false, distanceFromOffice: distance, radius, code: 'GEOFENCE_VIOLATION' },
        });
      }
    }
  }

  const { checkInDeadlineH, checkInDeadlineM } = getWorkHours(internship.workShift);
  const now    = new Date();
  const isLate = isLateCheckIn(now, checkInDeadlineH, checkInDeadlineM);
  const deadlineStr = `${String(checkInDeadlineH).padStart(2,'0')}:${String(checkInDeadlineM).padStart(2,'0')}`;

  if (isLate && !violationReason) {
    return res.status(422).json({
      success: false,
      message: `You are checking in late (after ${deadlineStr}). Please provide a reason.`,
      data: { requiresReason: true, type: 'late_checkin', workShift: internship.workShift },
    });
  }

  const update = {
    $setOnInsert: { student: req.user._id, internship: internship._id, date: now },
    $set: {
      'checkIn.time':      now,
      'checkIn.latitude':  latitude,
      'checkIn.longitude': longitude,
      'checkIn.isLate':    isLate,
      isGeofenceViolation,
      status: isLate ? 'late' : 'present',
    },
  };

  if (isLate && violationReason) {
    update.$set.violation = { type: 'late_checkin', reason: violationReason.trim(), recordedAt: now };
  }

  const record = await Attendance.findOneAndUpdate(
    { student: req.user._id, date: { $gte: start, $lte: end } },
    update,
    { upsert: true, new: true }
  );

  // Notify both supervisors
  const studentUser = await User.findById(req.user._id, 'firstName lastName').lean();
  const studentName = `${studentUser.firstName} ${studentUser.lastName}`;
  const { h, m }    = watTime(now);
  const timeStr     = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const locationStr = studentProfile?.workLocation?.address
    || `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
  const notifBody   = `${studentName} checked in at ${timeStr}${isLate ? ' (late)' : ''} · ${locationStr}`;

  const notifTargets = [internship.industrySupervisor, internship.institutionSupervisor].filter(Boolean);
  await Promise.allSettled(
    notifTargets.map((recipientId) =>
      sendNotification({
        recipientId,
        title:    'Student Checked In',
        body:     notifBody,
        type:     'attendance_checkin',
        metadata: { studentId: req.user._id.toString(), studentName, time: now.toISOString(), latitude, longitude, action: 'checkin', isLate },
      })
    )
  );

  res.json({ success: true, data: record });
});

// ── POST /api/attendance/checkout ─────────────────────────────────────────────
exports.checkOut = asyncHandler(async (req, res) => {
  const { latitude, longitude, violationReason } = req.body;

  const { start, end } = todayBounds();
  const record = await Attendance.findOne({ student: req.user._id, date: { $gte: start, $lte: end } });

  if (!record?.checkIn?.time) {
    return res.status(400).json({ success: false, message: 'You have not checked in today.' });
  }
  if (record.checkOut?.time) {
    return res.status(409).json({ success: false, message: 'You have already checked out today.' });
  }

  const internship = await Internship.findById(record.internship).lean();
  const { endH, checkOutEarliestH, checkOutEarliestM } = getWorkHours(internship?.workShift);
  const now     = new Date();
  const isEarly = isEarlyCheckOut(now, checkOutEarliestH, checkOutEarliestM);
  const earliestStr = `${String(checkOutEarliestH).padStart(2,'0')}:${String(checkOutEarliestM).padStart(2,'0')}`;

  if (isEarly && !violationReason) {
    return res.status(422).json({
      success: false,
      message: `You are checking out early (before ${earliestStr}). Please provide a reason.`,
      data: { requiresReason: true, type: 'early_checkout', workShift: internship?.workShift },
    });
  }

  record.checkOut = {
    time:             now,
    latitude:         latitude ?? null,
    longitude:        longitude ?? null,
    isEarlyDeparture: isEarly,
  };

  if (isEarly && violationReason) {
    record.violation = { type: 'early_checkout', reason: violationReason.trim(), recordedAt: now };
  }

  await record.save();

  // Notify both supervisors
  const [studentUser, studentProfileOut] = await Promise.all([
    User.findById(req.user._id, 'firstName lastName').lean(),
    StudentProfile.findOne({ user: req.user._id }).lean(),
  ]);
  const studentName    = `${studentUser.firstName} ${studentUser.lastName}`;
  const { h, m }       = watTime(now);
  const timeStr        = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const locationStrOut = studentProfileOut?.workLocation?.address
    || (latitude != null ? `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}` : null);
  const notifBody      = `${studentName} checked out at ${timeStr}${isEarly ? ' (early)' : ''}${locationStrOut ? ` · ${locationStrOut}` : ''}`;

  const notifTargets = [internship.industrySupervisor, internship.institutionSupervisor].filter(Boolean);
  await Promise.allSettled(
    notifTargets.map((recipientId) =>
      sendNotification({
        recipientId,
        title:    'Student Checked Out',
        body:     notifBody,
        type:     'attendance_checkout',
        metadata: { studentId: req.user._id.toString(), studentName, time: now.toISOString(), latitude, longitude, action: 'checkout', isEarly },
      })
    )
  );

  res.json({ success: true, data: record });
});

// ── GET /api/attendance/student/:studentId — supervisor views a student ────────
exports.getStudentAttendance = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { limit = 20, page = 1 } = req.query;

  const student = await User.findById(studentId).lean();
  if (!student || student.role !== 'student') {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  const skip    = (Number(page) - 1) * Number(limit);
  const [records, total] = await Promise.all([
    Attendance.find({ student: studentId }).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
    Attendance.countDocuments({ student: studentId }),
  ]);

  const violations = records.filter((r) => r.violation?.reason);

  res.json({
    success: true,
    data: {
      records,
      violations,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    },
  });
});

// ── GET /api/attendance/violations/:studentId — violations only ───────────────
exports.getStudentViolations = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const violations = await Attendance.find({
    student: studentId,
    'violation.reason': { $exists: true, $ne: null },
  }).sort({ date: -1 }).lean();

  res.json({ success: true, data: violations });
});
