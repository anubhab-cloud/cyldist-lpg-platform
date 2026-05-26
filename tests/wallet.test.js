'use strict';

// Set environment variables BEFORE importing app or userService
process.env.RAZORPAY_KEY_ID = 'test_key_id';
process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';

const mockCreate = jest.fn();
const mockFetch = jest.fn();

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: (...args) => mockCreate(...args),
        fetch: (...args) => mockFetch(...args),
      },
    };
  });
});

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const crypto = require('crypto');

// Helpers
async function registerAndLogin(role = 'customer') {
  const userData = {
    name: `Test ${role}`,
    email: `${role}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}@test.com`,
    password: 'Test@12345',
    phone: '+919876543210',
  };

  if (role === 'admin' || role === 'agent') {
    const passwordHash = await require('bcryptjs').hash(userData.password, 10);
    const user = await User.create({ ...userData, role, passwordHash });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userData.email, password: userData.password });
    return { user, token: loginRes.body.data?.accessToken };
  }

  const res = await request(app).post('/api/v1/auth/register').send(userData);
  const user = res.body.data?.user;
  if (user) {
    await User.findByIdAndUpdate(user.id || user._id, { kycStatus: 'verified' });
  }
  return { user, token: res.body.data?.accessToken };
}

describe('Wallet Deposit API', () => {
  let customerToken, customer;

  beforeEach(async () => {
    jest.clearAllMocks();
    const customerData = await registerAndLogin('customer');
    customerToken = customerData.token;
    customer = customerData.user;
  });

  // ============================================
  // POST /api/v1/users/me/wallet/deposit
  // ============================================
  describe('POST /api/v1/users/me/wallet/deposit', () => {
    it('should initiate a wallet deposit order successfully', async () => {
      mockCreate.mockResolvedValue({
        id: 'order_test_init_123',
        amount: 50000, // 500 INR in paise
        currency: 'INR',
        status: 'created',
      });

      const res = await request(app)
        .post('/api/v1/users/me/wallet/deposit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amount: 500 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('razorpayOrderId', 'order_test_init_123');
      expect(res.body.data).toHaveProperty('amount', 500);
      expect(res.body.data).toHaveProperty('currency', 'INR');
      
      expect(mockCreate).toHaveBeenCalledWith({
        amount: 50000,
        currency: 'INR',
        receipt: expect.stringMatching(/^deposit_\d+/),
      });
    });

    it('should return 422 for a negative amount', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/wallet/deposit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amount: -10 });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 422 for a zero amount', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/wallet/deposit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ amount: 0 });

      expect(res.status).toBe(422);
    });

    it('should return 422 for missing amount', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/wallet/deposit')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(422);
    });
  });

  // ============================================
  // POST /api/v1/users/me/wallet/verify
  // ============================================
  describe('POST /api/v1/users/me/wallet/verify', () => {
    const razorpayOrderId = 'order_test_verify_123';
    const razorpayPaymentId = 'pay_test_verify_456';
    let validSignature;

    beforeEach(() => {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      validSignature = crypto
        .createHmac('sha256', 'test_key_secret')
        .update(body)
        .digest('hex');
    });

    it('should verify payment signature and credit funds atomically', async () => {
      mockFetch.mockResolvedValue({
        id: razorpayOrderId,
        amount: 50000, // 500 INR in paise
        status: 'paid',
      });

      const initialUser = await User.findById(customer.id || customer._id);
      expect(initialUser.walletBalance).toBe(0);

      const res = await request(app)
        .post('/api/v1/users/me/wallet/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletBalance).toBe(500);

      // Double-verify in Database
      const updatedUser = await User.findById(customer.id || customer._id);
      expect(updatedUser.walletBalance).toBe(500);
      expect(updatedUser.processedPayments).toContain(razorpayPaymentId);
      expect(mockFetch).toHaveBeenCalledWith(razorpayOrderId);
    });

    it('should reject and return 400 for incorrect signature', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/wallet/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: 'invalid_signature_here',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/signature verification failed/i);
    });

    it('should reject double-spending (replaying the same payment ID)', async () => {
      mockFetch.mockResolvedValue({
        id: razorpayOrderId,
        amount: 50000,
        status: 'paid',
      });

      // 1. First deposit
      const firstRes = await request(app)
        .post('/api/v1/users/me/wallet/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        });
      expect(firstRes.status).toBe(200);

      // 2. Second deposit attempt with identical parameters
      const secondRes = await request(app)
        .post('/api/v1/users/me/wallet/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.success).toBe(false);
      expect(secondRes.body.message).toMatch(/already been credited/i);

      // Verify wallet was only credited once
      const finalUser = await User.findById(customer.id || customer._id);
      expect(finalUser.walletBalance).toBe(500);
    });

    it('should reject if the order is not fully paid on Razorpay status check', async () => {
      mockFetch.mockResolvedValue({
        id: razorpayOrderId,
        amount: 50000,
        status: 'attempted', // Not paid
      });

      const res = await request(app)
        .post('/api/v1/users/me/wallet/verify')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: validSignature,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not been paid on Razorpay/i);
    });
  });
});
