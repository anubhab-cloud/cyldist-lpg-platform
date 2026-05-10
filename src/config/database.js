'use strict';

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('./logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

/**
 * Connects to MongoDB with automatic retry on failure.
 * @param {number} retryCount
 */
async function connectDB(retryCount = 0) {
  try {
    const conn = await mongoose.connect(config.db.uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host} (db: ${conn.connection.name})`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      logger.warn(
        `MongoDB connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}). Retrying in ${RETRY_DELAY_MS / 1000}s...`,
        { error: error.message }
      );
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retryCount + 1);
    }

    logger.error('MongoDB connection failed after max retries. Exiting.', { error: error.message });
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

module.exports = { connectDB };
