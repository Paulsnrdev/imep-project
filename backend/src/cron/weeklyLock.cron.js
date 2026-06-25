const LogbookWeek            = require('../models/LogbookWeek');
const { sendNotification }   = require('../services/notification.service');
const logger                 = require('../utils/logger');

/**
 * Friday 9:00 PM WAT — lock all open logbook weeks.
 * Notifies each student whose week is now locked.
 */
const runWeeklyLock = async () => {
  logger.info('[CRON] weeklyLock — started');
  const now = new Date();

  try {
    const openWeeks = await LogbookWeek.find({ isLocked: false });

    if (!openWeeks.length) {
      logger.info('[CRON] weeklyLock — no open weeks found');
      return;
    }

    const lockOps = openWeeks.map((week) =>
      LogbookWeek.findByIdAndUpdate(week._id, { isLocked: true, lockedAt: now })
    );
    await Promise.all(lockOps);

    // Notify each student
    const notifications = openWeeks.map((week) =>
      sendNotification({
        recipientId: week.student,
        title:       'Logbook Locked',
        body:        `Week ${week.weekNumber} logbook has been locked. No further edits allowed.`,
        type:        'logbook_reminder',
        metadata:    { weekId: week._id.toString(), weekNumber: week.weekNumber },
      })
    );
    await Promise.allSettled(notifications);

    logger.info(`[CRON] weeklyLock — locked ${openWeeks.length} week(s)`);
  } catch (err) {
    logger.error('[CRON] weeklyLock — error', { error: err.message });
  }
};

module.exports = runWeeklyLock;
