'use strict';

const dotenv = require('dotenv');
const path = require('path');

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validates that a required environment variable exists.
 * @param {string} name
 * @returns {string}
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Returns an optional env var with a default value.
 * @param {string} name
 * @param {string} defaultValue
 * @returns {string}
 */
function optional(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

const config = {
  env: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',
  isTest: optional('NODE_ENV', 'development') === 'test',

  server: {
    port: parseInt(optional('PORT', '5000'), 10),
    apiVersion: optional('API_VERSION', 'v1'),
    corsOrigin: optional('CORS_ORIGIN', 'http://localhost:3000').split(',').map(s => s.trim()),
  },

  db: {
    uri: optional('NODE_ENV', 'development') === 'test'
      ? optional('MONGO_URI_TEST', 'mongodb://localhost:27017/cylinder_platform_test')
      : required('MONGO_URI'),
  },

  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: parseInt(optional('REDIS_PORT', '6379'), 10),
    password: optional('REDIS_PASSWORD', '') || undefined,
    db: parseInt(optional('REDIS_DB', '0'), 10),
    ttlDefault: parseInt(optional('REDIS_TTL_DEFAULT', '3600'), 10),
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    max: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
    authMax: parseInt(optional('AUTH_RATE_LIMIT_MAX', '10'), 10),
  },

  inventory: {
    lowStockThreshold: parseInt(optional('LOW_STOCK_THRESHOLD', '10'), 10),
  },

  notification: {
    smtp: {
      host: optional('SMTP_HOST', ''),
      port: parseInt(optional('SMTP_PORT', '587'), 10),
      user: optional('SMTP_USER', ''),
      pass: optional('SMTP_PASS', ''),
      from: optional('SMTP_FROM', 'noreply@cylinderplatform.com'),
    },
    twilio: {
      accountSid: optional('TWILIO_ACCOUNT_SID', ''),
      authToken: optional('TWILIO_AUTH_TOKEN', ''),
      fromNumber: optional('TWILIO_FROM_NUMBER', ''),
    },
    fcmServerKey: optional('FCM_SERVER_KEY', ''),
  },

  logging: {
    level: optional('LOG_LEVEL', 'info'),
    dir: optional('LOG_DIR', 'logs'),
  },

  socket: {
    corsOrigin: optional('SOCKET_CORS_ORIGIN', 'http://localhost:3000').split(',').map(s => s.trim()),
  },

  maps: {
    googleApiKey: optional('GOOGLE_MAPS_API_KEY', ''),
  },

  admin: {
    name: optional('ADMIN_NAME', 'Super Admin'),
    email: optional('ADMIN_EMAIL', 'admin@cylinderplatform.com'),
    password: optional('ADMIN_PASSWORD', 'Admin@123456'),
    phone: optional('ADMIN_PHONE', '+919999999999'),
  },
};

module.exports = config;
