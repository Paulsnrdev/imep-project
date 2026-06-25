const Internship           = require('../models/Internship');
const LogbookWeek          = require('../models/LogbookWeek');
const { sendNotification } = require('../services/notification.service');
const logger               = require('../utils/logger');

/**
 * Returns the Monday and Friday of the next calendar week (WAT).
 */
const getNextWeekBounds = () => {
  const now  = new Date();
  const day  = now.getDay(); // 0=Sun
  const diff = day === 0 ? 1 : 8 - day; // days until next Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);
  return { monday, friday };
};

/**
 * Sunday 11:00 PM WAT — generate LogbookWeek shells for the upcoming week
 * for every active internship that doesn't already have one.
 */
const runWeeklyReset = async () => {
  logger.info('[CRON] weeklyReset — started');

  try {
    const { monday, friday } = getNextWeekBounds();

    const activeInternships = await Internship.find({ isActive: true, status: 'active' });

    if (!activeInternships.length) {
      logger.info('[CRON] weeklyReset — no active internships');
      return;
    }

    let created = 0;

    for (const internship of activeInternships) {
      // Skip if a week shell already exists for this date range
      const exists = await LogbookWeek.findOne({
        internship: internship._id,
        weekStartDate: monday,
      });
      if (exists) continue;

      // Derive week number from internship start
      const msPerWeek  = 7 * 24 * 60 * 60 * 1000;
      const weekNumber = Math.floor((monday - internship.startDate) / msPerWeek) + 1;

      await LogbookWeek.create({
        internship:    internship._id,
        student:       internship.student,
        weekNumber,
        weekStartDate: monday,
        weekEndDate:   friday,
        isLocked:      false,
      });

      await sendNotification({
        recipientId: internship.student,
        title:       'New Week Open',
        body:        `Week ${weekNumber} logbook is now open. Start logging from Monday 7:30 AM.`,
        type:        'general',
        metadata:    { weekNumber },
      });

      created++;
    }

    logger.info(`[CRON] weeklyReset — created ${created} new week shell(s)`);
  } catch (err) {
    logger.error('[CRON] weeklyReset — error', { error: err.message });
  }
};

module.exports = runWeeklyReset;
