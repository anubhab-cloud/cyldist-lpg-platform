'use strict';

const authService = require('./auth.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and token management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       409:
 *         description: Email already in use
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return response.success(res, 201, 'Registration successful.', result);
});

/**
 * @swagger
 * /auth/register-agent:
 *   post:
 *     summary: Register a new delivery agent (Admin only)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent registered successfully
 */
const registerAgent = asyncHandler(async (req, res) => {
  const result = await authService.registerAgent(req.body);
  return response.success(res, 201, 'Delivery agent registered successfully.', result);
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive JWT tokens
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful with token pair
 *       401:
 *         description: Invalid credentials
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return response.success(res, 200, 'Login successful.', result);
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New token pair issued
 *       401:
 *         description: Invalid or expired refresh token
 */
const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  return response.success(res, 200, 'Token refreshed successfully.', result);
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  return response.success(res, 200, 'Logged out successfully.');
});

const requestOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestOtp(req.body);
  return response.success(res, 200, result.message);
});

const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  return response.success(res, 200, 'Login successful.', result);
});

module.exports = { register, registerAgent, login, requestOtp, verifyOtp, refresh, logout };
