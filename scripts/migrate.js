'use strict';

/**
 * Migration script — creates all required MongoDB indexes.
 * Run this once after initial deployment or after schema changes.
 *
 * Usage: npm run migrate
 */

const mongoose = require('mongoose');
require('dotenv').config();

const config = require('../src/config');
const logger = require('../src/config/logger');

// Import models to trigger schema + index registration
require('../src/modules/users/user.model');
require('../src/modules/inventory/inventory.model');
require('../src/modules/orders/order.model');
require('../src/modules/chat/chat.model');

async function migrate() {
  try {
    logger.info('Connecting to database...');
    await mongoose.connect(config.db.uri);
    logger.info('Connected!');

    logger.info('Creating indexes...');

    // syncIndexes() drops old indexes and creates new ones defined in schema
    const models = Object.values(mongoose.models);
    for (const Model of models) {
      logger.info(`  → Syncing indexes for ${Model.modelName}`);
      await Model.syncIndexes();
    }

    // Additional custom indexes (if not already in schema)
    const db = mongoose.connection.db;

    // TTL index for soft-deleted users cleanup (optional)
    // await db.collection('users').createIndex({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60, sparse: true });

    logger.info('✅ All indexes created successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', { error: err.message, stack: err.stack });
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();
