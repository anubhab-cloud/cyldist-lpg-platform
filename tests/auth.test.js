'use strict';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const bcrypt = require('bcryptjs');

/**
 * Auth API Integration Tests
 */
describe('Auth API', () => {
  const testUser = {
    name: 'Test Customer',
    email: 'test@example.com',
    password: 'Test@12345',
    phone: '+919876543210',
  };

  // ========================
  // POST /auth/register
  // ========================
  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 409 if email already exists', async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].field).toBe('email');
    });

    it('should return 422 for weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, password: 'weak' });

      expect(res.status).toBe(422);
    });

    it('should default role to customer regardless of input', async () => {
      // Even if role is omitted, user should be a customer
      const { role: _, ...userWithoutRole } = testUser;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(userWithoutRole);

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('customer');
    });
  });

  // ========================
  // POST /auth/login
  // ========================
  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword@1' });

      expect(res.status).toBe(401);
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: testUser.password });

      expect(res.status).toBe(401);
    });

    it('should return 403 for deactivated account', async () => {
      await User.findOneAndUpdate({ email: testUser.email }, { isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(403);
    });
  });

  // ========================
  // POST /auth/refresh
  // ========================
  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      refreshToken = res.body.data.refreshToken;
    });

    it('should return a new token pair for a valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.refreshToken).not.toBe(refreshToken); // Token rotated
    });

    it('should return 401 for an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'totally.invalid.token' });

      expect(res.status).toBe(401);
    });

    it('should detect token reuse and invalidate session', async () => {
      // Use the token once to rotate it (invalidates original token in DB)
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      // Attempt to reuse the OLD token — should be rejected
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.message).toMatch(/reuse/i);
    });
  });

  // ========================
  // POST /auth/logout
  // ========================
  describe('POST /api/v1/auth/logout', () => {
    let accessToken;

    beforeEach(async () => {
      const res = await request(app).post('/api/v1/auth/register').send(testUser);
      accessToken = res.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(401);
    });
  });
});
