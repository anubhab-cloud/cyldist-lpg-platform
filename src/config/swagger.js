'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Cylinder Distribution Platform API',
      version: '1.0.0',
      description: `
## Overview
Production-grade REST API for a Cylinder/LPG Distribution Platform.

Supports multi-role authentication (Customer, Admin, Delivery Agent), 
real-time order tracking via Socket.IO, and full order lifecycle management.

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
\`Authorization: Bearer <access_token>\`

## Rate Limiting
- Auth endpoints: 10 requests per 15 minutes
- Other endpoints: 100 requests per 15 minutes

## Socket.IO Events
Connect to \`ws://host:port\` with \`?token=<access_token>\`
      `,
      contact: {
        name: 'API Support',
        email: 'support@cylinderplatform.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}/api/${config.server.apiVersion}`,
        description: 'Local development server',
      },
      {
        url: `https://api.cylinderplatform.com/api/${config.server.apiVersion}`,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            statusCode: { type: 'integer' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            statusCode: { type: 'integer' },
            message: { type: 'string' },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.model.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
