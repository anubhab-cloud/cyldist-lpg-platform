'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const { globalLimiter } = require('./shared/middleware/rateLimiter.middleware');
const { errorHandler, notFound } = require('./shared/middleware/error.middleware');

// Module routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const orderRoutes = require('./modules/orders/order.routes');
const deliveryRoutes = require('./modules/delivery/delivery.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const supportRoutes = require('./modules/support/support.routes');

const app = express();

// ============================================================
// Security Middleware
// ============================================================

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
      imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
    },
  },
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.server.corsOrigin.includes(origin) || config.isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// HTTP Parameter Pollution protection
app.use(hpp());

// XSS sanitization middleware
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = JSON.parse(xss(JSON.stringify(req.body)));
  }
  next();
});

// Rate limiting
app.use(`/api/${config.server.apiVersion}`, globalLimiter);

// ============================================================
// Request Parsing
// ============================================================

app.use(express.json({ limit: '10kb' })); // Limit payload size to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize data against NoSQL query injection
app.use(mongoSanitize());

// Compress responses
app.use(compression());

// ============================================================
// Logging
// ============================================================

if (!config.isTest) {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.http(message.trim()),
      },
      skip: (req) => req.path === '/health', // Skip health check logs
    })
  );
}

// ============================================================
// API Documentation
// ============================================================

app.use(
  `/api/${config.server.apiVersion}/docs`,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Cylinder Platform API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  })
);

// Expose raw OpenAPI spec
app.get(`/api/${config.server.apiVersion}/docs.json`, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================================
// Health Check
// ============================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================
// API Routes
// ============================================================

const apiPrefix = `/api/${config.server.apiVersion}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/inventory`, inventoryRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/delivery`, deliveryRoutes);
app.use(`${apiPrefix}/chat`, chatRoutes);
app.use(`${apiPrefix}/support`, supportRoutes);

// ============================================================
// Error Handling (must be last)
// ============================================================

app.use(notFound);
app.use(errorHandler);

module.exports = app;
