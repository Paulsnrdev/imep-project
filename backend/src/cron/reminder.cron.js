const LogbookWeek          = require('../models/LogbookWeek');
const DailyLogEntry        = require('../models/DailyLogEntry');
const Attendance           = require('../models/Attendance');
const Internship           = require('../models/Internship');
const User                 = require('../models/user');
const { sendNotification, broadcastNotification } = require('../services/notification.service');
const { FCM }              = require('../utils/constants');
const logger               = require('../utils/logger');

/**
 * Thursday 10:00 AM WAT — remind students who haven't submitted all entries this week.
 */
const runSubmissionReminder = async () => {
  logger.info('[CRON] submissionReminder — started');

  try {
    const openWeeks = await LogbookWeek.find({ isLocked: false });

    const reminders = openWeeks.map(async (week) => {
      const entryCount = await DailyLogEntry.countDocuments({ logbookWeek: week._id });
      if (entryCount < 5) {
        return sendNotification({
          recipientId: week.student,
          title:       FCM.REMINDER_TITLE,
          body:        FCM.REMINDER_BODY,
          type:        'logbook_reminder',
          metadata:    { weekId: week._id.toString(), weekNumber: week.weekNumber, entryCount },
        });
      }
    });

    const results = await Promise.allSettled(reminders);
    const sent    = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    logger.info(`[CRON] submissionReminder — sent ${sent} reminder(s)`);
  } catch (err) {
    logger.error('[CRON] submissionReminder — error', { error: err.message });
  }
};

/**
 * Mon-Fri 23:55 WAT — flag students who checked in but never checked out today.
 */
const runMissingCheckoutFlag = async () => {
  logger.info('[CRON] missingCheckoutFlag — started');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const missing = await Attendance.find({
      date:              { $gte: today, $lt: tomorrow },
      'checkIn.time':    { $exists: true, $ne: null },
      'checkOut.time':   { $exists: false },
      missedCheckout:    false,
    });

    const updates = missing.map((record) =>
      Attendance.findByIdAndUpdate(record._id, { missedCheckout: true })
    );
    await Promise.all(updates);

    const notifications = missing.map((record) =>
      sendNotification({
        recipientId: record.student,
        title:       FCM.CHECKOUT_TITLE,
        body:        FCM.CHECKOUT_BODY,
        type:        'attendance_flagged',
        metadata:    { attendanceId: record._id.toString() },
      })
    );
    await Promise.allSettled(notifications);

    logger.info(`[CRON] missingCheckoutFlag — flagged ${missing.length} record(s)`);
  } catch (err) {
    logger.error('[CRON] missingCheckoutFlag — error', { error: err.message });
  }
};

/**
 * Mon-Fri 17:05 WAT — notify industry and institution supervisors about absent students.
 * A student is absent if they have no Attendance record (no check-in) for today.
 */
const runAbsenceAlert = async () => {
  logger.info('[CRON] absenceAlert — started');

  try {
    const WAT       = 60 * 60 * 1000;
    const watNow    = new Date(Date.now() + WAT);
    watNow.setUTCHours(0, 0, 0, 0);
    const todayStart = new Date(watNow.getTime() - WAT);
    const todayEnd   = new Date(todayStart.getTime() + 86400000);

    // All active internships
    const internships = await Internship.find({ isActive: true })
      .populate('student', 'firstName lastName')
      .lean();

    if (!internships.length) return;

    const studentIds = internships.map((i) => i.student._id);

    // Students who DID check in today
    const checkedIn = await Attendance.find({
      student:        { $in: studentIds },
      date:           { $gte: todayStart, $lt: todayEnd },
      'checkIn.time': { $exists: true, $ne: null },
    }).select('student').lean();

    const checkedInSet = new Set(checkedIn.map((a) => a.student.toString()));

    // Filter to absent students
    const absent = internships.filter((i) => !checkedInSet.has(i.student._id.toString()));

    let notified = 0;
    const tasks = absent.map(async (internship) => {
      const studentName = `${internship.student.firstName} ${internship.student.lastName}`;
      const body        = FCM.ABSENCE_SUP_BODY(studentName);
      const metadata    = { studentId: internship.student._id.toString(), internshipId: internship._id.toString() };

      const recipientIds = [
        internship.industrySupervisor,
        internship.institutionSupervisor,
      ].filter(Boolean).map((id) => id.toString());

      if (!recipientIds.length) return;

      await broadcastNotification(recipientIds, {
        title:    FCM.ABSENCE_SUP_TITLE,
        body,
        type:     'attendance_flagged',
        metadata,
      });
      notified++;
    });

    await Promise.allSettled(tasks);
    logger.info(`[CRON] absenceAlert — notified supervisors for ${notified} absent student(s)`);
  } catch (err) {
    logger.error('[CRON] absenceAlert — error', { error: err.message });
  }
};

module.exports = { runSubmissionReminder, runMissingCheckoutFlag, runAbsenceAlert };
