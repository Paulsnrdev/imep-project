const { Queue }          = require('bullmq');
const { getRedisClient } = require('./redis');
const startCronWorker    = require('../workers/cron.worker');
const { CRON }           = require('../utils/constants');
const logger             = require('../utils/logger');

const JOB_SCHEDULES = [
  { name: 'weeklyLock',          cron: CRON.WEEKLY_LOCK       },
  { name: 'gradeCalculation',    cron: CRON.GRADE_CALC        },
  { name: 'weeklyReset',         cron: CRON.WEEKLY_RESET      },
  { name: 'submissionReminder',  cron: CRON.REMINDER_SUBMIT   },
  { name: 'missingCheckoutFlag', cron: CRON.REMINDER_CHECKOUT },
  { name: 'absenceAlert',        cron: CRON.ABSENCE_ALERT     },
];

const registerCronJobs = async () => {
  const queue = new Queue('cron', { connection: getRedisClient() });

  // Upsert each repeating job — safe to call on every restart
  for (const { name, cron } of JOB_SCHEDULES) {
    await queue.upsertJobScheduler(
      `scheduler:${name}`,
      { pattern: cron, tz: CRON.TIMEZONE },
      { name, data: {} }
    );
  }

  startCronWorker();

  logger.info('[CRON] All BullMQ jobs scheduled', {
    jobs:     JOB_SCHEDULES.map((j) => j.name),
    timezone: CRON.TIMEZONE,
  });
};

module.exports = registerCronJobs;
