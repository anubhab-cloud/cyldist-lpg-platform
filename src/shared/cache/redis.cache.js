'use strict';

const { getRedisClient } = require('../../config/redis');
const logger = require('../../config/logger');

/**
 * Redis cache helper with graceful no-op when Redis is unavailable.
 */
const cache = {
  /**
   * Get a value from cache. Returns null if not found or Redis unavailable.
   * @param {string} key
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return null;
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn('Redis GET failed — cache miss', { key, error: err.message });
      return null;
    }
  },

  /**
   * Set a value in cache.
   * @param {string} key
   * @param {*} value - Will be JSON-serialized
   * @param {number} [ttlSeconds] - Defaults to config value
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return;
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      logger.warn('Redis SET failed — skipping cache write', { key, error: err.message });
    }
  },

  /**
   * Delete one or more keys from cache.
   * @param {...string} keys
   */
  async del(...keys) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return;
      if (keys.length) await client.del(...keys);
    } catch (err) {
      logger.warn('Redis DEL failed', { keys, error: err.message });
    }
  },

  /**
   * Increment a counter in Redis (useful for rate limiting and analytics).
   * @param {string} key
   * @param {number} [ttlSeconds]
   * @returns {Promise<number>}
   */
  async incr(key, ttlSeconds = 3600) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return 0;
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, ttlSeconds);
      return count;
    } catch (err) {
      logger.warn('Redis INCR failed', { key, error: err.message });
      return 0;
    }
  },

  /**
   * Store a value with a hash field (for agent location etc.)
   * @param {string} key
   * @param {string} field
   * @param {*} value
   */
  async hset(key, field, value) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return;
      await client.hset(key, field, JSON.stringify(value));
    } catch (err) {
      logger.warn('Redis HSET failed', { key, error: err.message });
    }
  },

  /**
   * Get a hash field value.
   * @param {string} key
   * @param {string} field
   * @returns {Promise<any|null>}
   */
  async hget(key, field) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return null;
      const data = await client.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn('Redis HGET failed', { key, error: err.message });
      return null;
    }
  },

  /**
   * Publish a message to a Redis channel (for Socket.IO multi-node scaling).
   * @param {string} channel
   * @param {*} message
   */
  async publish(channel, message) {
    try {
      const client = getRedisClient();
      if (!client || client.status !== 'ready') return;
      await client.publish(channel, JSON.stringify(message));
    } catch (err) {
      logger.warn('Redis PUBLISH failed', { channel, error: err.message });
    }
  },
};

module.exports = cache;
