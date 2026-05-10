'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const config = require('./index');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for console (dev-friendly)
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    let log = `${ts} [${level}]: ${stack || message}`;
    if (Object.keys(meta).length) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// JSON format for file (machine-readable, ELK-ready)
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    silent: config.isTest,
  }),
];

// File transports only outside test environment
if (!config.isTest) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(config.logging.dir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxFiles: '14d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(config.logging.dir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxFiles: '30d',
      zippedArchive: true,
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
});

module.exports = logger;
