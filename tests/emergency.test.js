'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Inventory = require('../src/modules/inventory/inventory.model');
const User = require('../src/modules/users/user.model');
const Order = require('../src/modules/orders/order.model');

// Helpers
async function registerAndLogin(role = 'customer') {
  const userData = {
    name: `Test ${role}`,
    email: `${role}.${Date.now()}@test.com`,
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

async function createWarehouse(adminToken, overrides = {}) {
  const warehouseData = {
    warehouseId: `WH-TEST-${Date.now()}`,
    warehouseName: 'Test Warehouse',
    location: { lat: 28.6139, lng: 77.2090 },
    totalCylinders: 100,
    lowStockThreshold: 10,
    ...overrides,
  };
  return request(app)
    .post('/api/v1/inventory')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(warehouseData);
}

describe('Emergency Crisis Management System', () => {
  let adminToken, customerToken, agentToken;
  let customer, agent, warehouse;

  beforeEach(async () => {
    const adminData = await registerAndLogin('admin');
    adminToken = adminData.token;

    const customerData = await registerAndLogin('customer');
    customerToken = customerData.token;
    customer = customerData.user;

    const agentData = await registerAndLogin('agent');
    agentToken = agentData.token;
    agent = agentData.user;

    const whRes = await createWarehouse(adminToken);
    warehouse = whRes.body.data;
  });

  const deliveryAddress = {
    line1: '123 Crisis Street',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  };

  describe('POST /api/v1/orders - Emergency Bookings', () => {
    it('should calculate priority score correctly for a high-priority emergency booking (Hospital)', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer={customerToken}`) // Wait, supertest requires proper token format
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Hospital',
          emergencyDependents: 10,
          emergencyPurpose: 'Oxygen and heating',
          gasRemainingPercent: 10,
          lastRefillDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
          averageMonthlyUsage: '4 cyl',
        });

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.isEmergency).toBe(true);
      expect(order.emergencyCategory).toBe('Hospital');
      
      // Verification of formula logic:
      // Hospital category weight = 60
      // Dependents weight = min(20, 10 * 2) = 20
      // Gas remaining weight = (100 - 10) * 0.4 = 36
      // Refill recency = min(30, 15) = 15
      // Anti-hoarding penalty = 0 (first order)
      // Total expected priority score = 60 + 20 + 36 + 15 = 131
      expect(order.priorityScore).toBe(131);
      expect(order.priority).toBe('urgent');
      expect(order.hoardingPenaltyApplied).toBe(false);
    });

    it('should calculate priority score correctly for a lower-priority household emergency', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Household',
          emergencyDependents: 2,
          emergencyPurpose: 'Cooking for toddlers',
          gasRemainingPercent: 80,
          lastRefillDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          averageMonthlyUsage: '1 cyl',
        });

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.isEmergency).toBe(true);
      expect(order.emergencyCategory).toBe('Household');

      // Formula breakdown:
      // Household category weight = 30
      // Dependents weight = min(20, 2 * 2) = 4
      // Gas remaining weight = (100 - 80) * 0.4 = 8
      // Refill recency = min(30, 5) = 5
      // Anti-hoarding check: daysSinceLastRefill (5) < 7 days triggers hoarding penalty (-25)
      // Total expected priority score = 30 + 4 + 8 + 5 - 25 = 22
      expect(order.hoardingPenaltyApplied).toBe(true);
      expect(order.priorityScore).toBe(22);
      expect(order.priority).toBe('normal');
      expect(order.notes).toContain('[FLAGGED: Suspicious demand pattern detected. Flagged for manual review.]');
    });

    it('should trigger the hoarding penalty if customer has ordered multiple cylinders in last 30 days', async () => {
      // Create first booking (3 cylinders)
      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 3,
        });

      // Try creating an emergency booking (total cylinders in last 30 days would exceed 2)
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Hospital',
          emergencyDependents: 5,
          gasRemainingPercent: 20,
          lastRefillDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.hoardingPenaltyApplied).toBe(true);
      // Expected priority score calculation:
      // Hospital category weight = 60
      // Dependents = min(20, 5 * 2) = 10
      // Gas weight = (100 - 20) * 0.4 = 32
      // Refill recency = min(30, 10) = 10
      // Hoarding penalty = -25
      // Total score = 60 + 10 + 32 + 10 - 25 = 87
      expect(order.priorityScore).toBe(87);
      expect(order.priority).toBe('urgent'); // 87 is still >= 75
    });
  });

  describe('Get /orders and Get /orders/:orderId - Dynamic Queue Ranking', () => {
    it('should assign correct queuePosition rank based on comparative priorityScores', async () => {
      // Register multiple customers and place emergency orders of varying priority scores
      const c1 = await registerAndLogin('customer');
      const c2 = await registerAndLogin('customer');
      const c3 = await registerAndLogin('customer');

      // Order 1 (Lowest score)
      const orderLowRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${c1.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Restaurant', // 15
          emergencyDependents: 0, // 0
          gasRemainingPercent: 90, // 4
          lastRefillDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30
          // Total Score: 15 + 0 + 4 + 30 = 49
        });

      // Order 2 (Highest score)
      const orderHighRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${c2.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Hospital', // 60
          emergencyDependents: 10, // 20
          gasRemainingPercent: 10, // 36
          lastRefillDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30
          // Total Score: 60 + 20 + 36 + 30 = 146
        });

      // Order 3 (Medium score)
      const orderMedRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${c3.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Household', // 30
          emergencyDependents: 5, // 10
          gasRemainingPercent: 50, // 20
          lastRefillDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30
          // Total Score: 30 + 10 + 20 + 30 = 90
        });

      // Get Order Low details
      const lowDetailRes = await request(app)
        .get(`/api/v1/orders/${orderLowRes.body.data.orderId}`)
        .set('Authorization', `Bearer ${c1.token}`);
      expect(lowDetailRes.body.data.queuePosition).toBe(3); // Rank 3 (146, 90, 49)

      // Get Order Med details
      const medDetailRes = await request(app)
        .get(`/api/v1/orders/${orderMedRes.body.data.orderId}`)
        .set('Authorization', `Bearer ${c3.token}`);
      expect(medDetailRes.body.data.queuePosition).toBe(2); // Rank 2 (146, 90, 49)

      // Get Order High details
      const highDetailRes = await request(app)
        .get(`/api/v1/orders/${orderHighRes.body.data.orderId}`)
        .set('Authorization', `Bearer ${c2.token}`);
      expect(highDetailRes.body.data.queuePosition).toBe(1); // Rank 1 (146, 90, 49)

      // Verify list orders contains enriched queue ranks for admin
      const adminListRes = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const adminOrders = adminListRes.body.data;
      const oHigh = adminOrders.find(o => o.orderId === orderHighRes.body.data.orderId);
      const oMed = adminOrders.find(o => o.orderId === orderMedRes.body.data.orderId);
      const oLow = adminOrders.find(o => o.orderId === orderLowRes.body.data.orderId);

      expect(oHigh.queuePosition).toBe(1);
      expect(oMed.queuePosition).toBe(2);
      expect(oLow.queuePosition).toBe(3);
    });
  });

  describe('PATCH /api/v1/orders/:orderId/priority - Admin Score Override', () => {
    it('should allow admin to override the priorityScore and automatically re-classify priority level', async () => {
      // Place an emergency booking
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
          isEmergency: true,
          emergencyCategory: 'Restaurant', // Score is low (~50-60)
          emergencyDependents: 0,
          gasRemainingPercent: 80,
          lastRefillDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      const orderId = res.body.data.orderId;
      expect(res.body.data.priority).toBe('medium');

      // Admin overrides the priority score to 95
      const overrideRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/priority`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          priorityScore: 95
        });

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.data.priorityScore).toBe(95);
      // Auto-reclassification should promote to urgent since 95 >= 75
      expect(overrideRes.body.data.priority).toBe('urgent');
    });

    it('should reject priority changes from non-admin users', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
        });

      const orderId = res.body.data.orderId;

      const overrideRes = await request(app)
        .patch(`/api/v1/orders/${orderId}/priority`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          priorityScore: 95
        });

      expect(overrideRes.status).toBe(403);
    });
  });

  describe('Crisis Mode Sector Cooldown & Limit Rules', () => {
    beforeEach(async () => {
      await request(app)
        .patch('/api/v1/inventory/crisis-mode')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true, severity: 'severe', message: 'Crisis Active' });
    });

    afterEach(async () => {
      await request(app)
        .patch('/api/v1/inventory/crisis-mode')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false });
    });

    it('should lock household customers to a strict 30-day cooldown during crisis', async () => {
      // First booking should succeed
      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.status).toBe('awaiting_allocation');

      // Second booking should fail due to 30-day lock period
      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 1,
        });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('strict 30-day lock period');
    });

    it('should lock hotels / commercial connections to a strict 7-day cooldown and apply 70% quantity reduction', async () => {
      // Register commercial user
      const commercialData = await registerAndLogin('customer');
      await User.findByIdAndUpdate(commercialData.user.id || commercialData.user._id, { facilityType: 'commercial' });

      // First booking should succeed but undergo 70% quantity cap reduction (10 -> 3 cylinders)
      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${commercialData.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 10,
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.cylinderCount).toBe(3); // 10 * 0.3 = 3 cylinders
      expect(res1.body.data.status).toBe('awaiting_allocation');

      // Second booking should fail due to 7-day lock period
      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${commercialData.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 5,
        });
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('mandatory 7-day lock period');
    });

    it('should allow hospital / medical facilities to book with no lockouts and no quantity caps', async () => {
      // Register medical user
      const medicalData = await registerAndLogin('customer');
      await User.findByIdAndUpdate(medicalData.user.id || medicalData.user._id, { facilityType: 'medical' });

      // First booking of 50 cylinders should succeed completely without any reduction
      const res1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${medicalData.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 50,
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.cylinderCount).toBe(50); // No reduction
      expect(res1.body.data.status).toBe('awaiting_allocation');

      // Second booking of 30 cylinders should also succeed completely with no cooldown block
      const res2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${medicalData.token}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 30,
        });
      expect(res2.status).toBe(201);
      expect(res2.body.data.cylinderCount).toBe(30); // No reduction
      expect(res2.body.data.status).toBe('awaiting_allocation');
    });
  });
});
