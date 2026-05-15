'use strict';

const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
const config = require('./index');
const logger = require('./logger');

let redisClient = null;

/**
 * Creates and returns a singleton Redis client.
 * If Redis is unavailable (e.g., in test env), logs a warning and returns null.
 * @returns {Redis | null}
 */
function getRedisClient() {
  if (redisClient) return redisClient;

  const options = {
    host: config.redis.host,
    port: config.redis.port,
    db: config.redis.db,
    // Retry strategy: exponential backoff capped at 30s
    // In development, stop after 3 retries to avoid log spam when Redis isn't running
    retryStrategy(times) {
      if (config.isDevelopment) {
        return null; // Stop retrying immediately in dev mode without noisy warnings
      }
      const delay = Math.min(times * 500, 30000);
      logger.warn(`Redis retry attempt ${times}, next attempt in ${delay}ms`);
      return delay;
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  };

  if (config.redis.password) {
    options.password = config.redis.password;
  }

  redisClient = new Redis(options);

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('ready', () => logger.info('Redis ready'));
  redisClient.on('error', (err) => {
    if (config.isDevelopment && (err.code === 'ECONNREFUSED' || err.message === 'Connection is closed.' || !err.message)) {
      return; // Suppress noisy connection errors in dev mode
    }
    logger.error('Redis error', { error: err.message });
  });
  redisClient.on('close', () => {
    if (!config.isDevelopment) logger.warn('Redis connection closed');
  });

  return redisClient;
}

/**
 * Connects the Redis client.
 */
async function connectRedis() {
  if (config.isTest) {
    logger.info('Skipping Redis connection in test environment');
    return null;
  }

  try {
    const client = getRedisClient();
    await client.connect();
    return client;
  } catch (err) {
    if (config.isDevelopment) {
      logger.info('Redis unavailable locally. Falling back to in-memory Redis Mock!');
      if (redisClient) {
        redisClient.disconnect();
      }
      redisClient = new RedisMock();
      return redisClient;
    }
    logger.warn('Redis connection failed — caching will be disabled', { error: err.message });
    return null;
  }
}

module.exports = { getRedisClient, connectRedis };
