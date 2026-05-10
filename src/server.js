'use strict';

const http = require('http');

// Must load config first (sets up dotenv)
const config = require('./config');
const logger = require('./config/logger');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const app = require('./app');
const { initSocket } = require('./socket');

// ============================================================
// Graceful Shutdown
// ============================================================

let server;

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close((err) => {
      if (err) {
        logger.error('Error during server close:', { error: err.message });
        process.exit(1);
      }
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 10s if graceful close hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timeout. Forcing exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// ============================================================
// Unhandled Errors
// ============================================================

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', { reason: String(reason) });
  // Don't exit — log and continue (some operational errors are non-fatal)
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================================
// Bootstrap
// ============================================================

async function bootstrap() {
  try {
    logger.info(`Starting Cylinder Distribution Platform API (env: ${config.env})...`);

    // Connect to databases
    await connectDB();
    await connectRedis();

    // Create HTTP server
    server = http.createServer(app);

    // Initialize Socket.IO
    const io = initSocket(server);

    // Make io available to req handlers if needed
    app.set('io', io);

    // Start listening
    server.listen(config.server.port, () => {
      logger.info(`🚀 Server running on port ${config.server.port}`);
      logger.info(`📖 API Docs: http://localhost:${config.server.port}/api/${config.server.apiVersion}/docs`);
      logger.info(`🔌 Socket.IO ready`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${config.server.port} is already in use`);
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    logger.error('Failed to start server:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
