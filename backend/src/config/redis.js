const { Redis } = require('ioredis');
const logger    = require('../utils/logger');

let client = null;

const getRedisClient = () => {
  if (client) return client;

  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck:     false,
  });

  client.on('connect', () => logger.info('[Redis] Connected'));
  client.on('error',   (err) => logger.error('[Redis] Error', { error: err.message }));

  return client;
};

module.exports = { getRedisClient };
