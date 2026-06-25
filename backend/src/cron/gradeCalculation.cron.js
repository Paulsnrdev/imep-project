const LogbookWeek          = require('../models/LogbookWeek');
const DailyLogEntry        = require('../models/DailyLogEntry');
const Attendance           = require('../models/Attendance');
const Grade                = require('../models/Grade');
const { sendNotification } = require('../services/notification.service');
const { calcSystemScore }  = require('../utils/calculateGrades');
const logger               = require('../utils/logger');

/**
 * Saturday 00:01 WAT — calculate system grades for all weeks locked the previous day.
 */
const runGradeCalculation = async () => {
  logger.info('[CRON] gradeCalculation — started');

  try {
    // Target: newly locked weeks (last 25 h) + any locked week whose grade has no system score yet
    const since = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const [newlyLocked, pendingGrades] = await Promise.all([
      LogbookWeek.find({ isLocked: true, lockedAt: { $gte: since } }),
      Grade.find({ isSystemCalculated: false }).distinct('logbookWeek'),
    ]);
    const pendingWeeks = pendingGrades.length
      ? await LogbookWeek.find({ _id: { $in: pendingGrades }, isLocked: true })
      : [];
    const seen = new Set();
    const lockedWeeks = [...newlyLocked, ...pendingWeeks].filter((w) => {
      const id = w._id.toString();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (!lockedWeeks.length) {
      logger.info('[CRON] gradeCalculation — no weeks to process');
      return;
    }

    let processed = 0;

    for (const week of lockedWeeks) {
      try {
        // Gather data for this week
        const [entries, attendance] = await Promise.all([
          DailyLogEntry.find({ logbookWeek: week._id }),
          Attendance.find({
            student: week.student,
            date:    { $gte: week.weekStartDate, $lte: week.weekEndDate },
          }),
        ]);

        const { attendanceScore, logbookScore, systemScore } = calcSystemScore(attendance, entries);

        // Upsert the Grade document
        await Grade.findOneAndUpdate(
          { student: week.student, logbookWeek: week._id },
          {
            student:            week.student,
            internship:         week.internship,
            logbookWeek:        week._id,
            weekNumber:         week.weekNumber,
            attendanceScore,
            logbookScore,
            systemScore,
            isSystemCalculated: true,
          },
          { upsert: true, new: true }
        );

        await sendNotification({
          recipientId: week.student,
          title:       'System Grade Calculated',
          body:        `Your Week ${week.weekNumber} system score: ${systemScore}/50. Supervisor grade pending.`,
          type:        'grade_posted',
          metadata:    { weekNumber: week.weekNumber, systemScore },
        });

        processed++;
      } catch (weekErr) {
        logger.error('[CRON] gradeCalculation — week error', {
          weekId: week._id,
          error: weekErr.message,
        });
      }
    }

    logger.info(`[CRON] gradeCalculation — processed ${processed}/${lockedWeeks.length} week(s)`);
  } catch (err) {
    logger.error('[CRON] gradeCalculation — fatal error', { error: err.message });
  }
};

module.exports = runGradeCalculation;
