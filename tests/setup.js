'use strict';

/**
 * Jest global test setup.
 * Uses mongodb-memory-server for a real in-memory MongoDB instance
 * so tests are isolated and don't require a running database.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Set test environment before requiring config
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_min_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_min_32_characters_long';
process.env.MONGO_URI = 'mongodb://localhost/test'; // Will be overridden below
process.env.PORT = '5001';
process.env.LOG_LEVEL = 'error'; // Silence logs during tests

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI_TEST = uri;
  process.env.MONGO_URI = uri;

  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clear all collections after each test for isolation
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({}))
  );
});
