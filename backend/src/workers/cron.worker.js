const { Worker }           = require('bullmq');
const { getRedisClient }   = require('../config/redis');
const runWeeklyLock        = require('../cron/weeklyLock.cron');
const runWeeklyReset       = require('../cron/weeklyReset.cron');
const runGradeCalculation  = require('../cron/gradeCalculation.cron');
const { runSubmissionReminder, runMissingCheckoutFlag, runAbsenceAlert } = require('../cron/reminder.cron');
const logger               = require('../utils/logger');

const JOB_HANDLERS = {
  weeklyLock:          runWeeklyLock,
  gradeCalculation:    runGradeCalculation,
  weeklyReset:         runWeeklyReset,
  submissionReminder:  runSubmissionReminder,
  missingCheckoutFlag: runMissingCheckoutFlag,
  absenceAlert:        runAbsenceAlert,
};

const startCronWorker = () => {
  const worker = new Worker(
    'cron',
    async (job) => {
      const handler = JOB_HANDLERS[job.name];
      if (!handler) {
        logger.warn(`[CronWorker] Unknown job: ${job.name}`);
        return;
      }
      logger.info(`[CronWorker] Running job: ${job.name}`);
      await handler();
    },
    {
      connection:  getRedisClient(),
      concurrency: 1, // cron jobs must not overlap
    }
  );

  worker.on('completed', (job) => logger.info(`[CronWorker] ${job.name} completed`));
  worker.on('failed',    (job, err) => logger.error(`[CronWorker] ${job.name} failed`, { error: err.message }));

  logger.info('[CronWorker] Worker started');
  return worker;
};

module.exports = startCronWorker;
