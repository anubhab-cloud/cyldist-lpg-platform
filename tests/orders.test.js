'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Inventory = require('../src/modules/inventory/inventory.model');
const User = require('../src/modules/users/user.model');

// Helpers
async function registerAndLogin(role = 'customer') {
  const userData = {
    name: `Test ${role}`,
    email: `${role}.${Date.now()}@test.com`,
    password: 'Test@12345',
    phone: '+919876543210',
  };

  if (role === 'admin' || role === 'agent') {
    // Create directly in DB with the right role
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

/**
 * Orders API Integration Tests
 */
describe('Orders API', () => {
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

  // ========================
  // POST /orders
  // ========================
  describe('POST /api/v1/orders', () => {
    const deliveryAddress = {
      line1: '123 Test Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    };

    it('should create an order and deduct inventory', async () => {
      const initialStock = warehouse.availableCylinders;

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress,
          cylinderCount: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('created');
      expect(res.body.data.cylinderCount).toBe(2);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data).toHaveProperty('chatRoomId');

      // Verify inventory deducted
      const updatedWarehouse = await Inventory.findById(warehouse._id);
      expect(updatedWarehouse.availableCylinders).toBe(initialStock - 2);
    });

    it('should return 403 when admin tries to create order', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ warehouseId: warehouse._id, deliveryAddress, cylinderCount: 1 });

      expect(res.status).toBe(403);
    });

    it('should return 409 for insufficient stock', async () => {
      // Create a warehouse with only 3 cylinders
      const smallWhRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          warehouseId: `WH-SMALL-${Date.now()}`,
          warehouseName: 'Small Warehouse',
          location: { lat: 28.6, lng: 77.2 },
          totalCylinders: 3,
          lowStockThreshold: 1,
        });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: smallWhRes.body.data._id,
          deliveryAddress,
          cylinderCount: 5, // More than available (3)
        });

      expect(res.status).toBe(409);
    });

    it('should return 422 for cylinderCount > 10', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ warehouseId: warehouse._id, deliveryAddress, cylinderCount: 11 });

      expect(res.status).toBe(422);
    });
  });

  // ========================
  // Order Lifecycle
  // ========================
  describe('Order Lifecycle', () => {
    let orderId, orderChatRoomId;
    const deliveryAddress = {
      line1: '456 Test Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    };

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ warehouseId: warehouse._id, deliveryAddress, cylinderCount: 1 });

      orderId = res.body.data?.orderId;
      orderChatRoomId = res.body.data?.chatRoomId;
    });

    it('admin should assign an agent to the order', async () => {
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: agent._id });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('assigned');
      expect(res.body.data.agentId).toBeTruthy();
    });

    it('agent should update status to out_for_delivery', async () => {
      // First assign
      await request(app)
        .patch(`/api/v1/orders/${orderId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agentId: agent._id });

      // Then move to out_for_delivery
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: 'out_for_delivery' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('out_for_delivery');
      expect(res.body.data.timeline).toHaveLength(3); // created, assigned, out_for_delivery
    });

    it('should reject invalid status transition', async () => {
      // Try jumping from created → delivered (invalid)
      const res = await request(app)
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(409);
    });

    it('customer should cancel their own order', async () => {
      const res = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'No longer needed' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');

      // Inventory should be released
      const updatedWarehouse = await Inventory.findById(warehouse._id);
      expect(updatedWarehouse.availableCylinders).toBe(warehouse.availableCylinders);
    });

    it('customer should not see another customer orders', async () => {
      const otherCustomer = await registerAndLogin('customer');
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherCustomer.token}`);

      expect(res.status).toBe(403);
    });
  });

  // ============================================
  // Booking Period Limits (Max 1 Cyl / 25 Days)
  // ============================================
  describe('Booking Period Limits', () => {
    let originalPeriod, originalMax;

    beforeAll(() => {
      originalPeriod = process.env.BOOKING_PERIOD_DAYS;
      originalMax = process.env.MAX_CYLINDERS_PER_PERIOD;
      
      process.env.BOOKING_PERIOD_DAYS = '25';
      process.env.MAX_CYLINDERS_PER_PERIOD = '1';
    });

    afterAll(() => {
      process.env.BOOKING_PERIOD_DAYS = originalPeriod;
      process.env.MAX_CYLINDERS_PER_PERIOD = originalMax;
    });

    it('should reject booking a single order with cylinderCount > 1', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress: { line1: '123 CP', city: 'Delhi', state: 'Delhi', pincode: '110001' },
          cylinderCount: 2,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/limit exceeded/i);
    });

    it('should block placing a new order if one was placed in the last 25 days', async () => {
      // 1. Place a successful order
      const firstRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress: { line1: '123 CP', city: 'Delhi', state: 'Delhi', pincode: '110001' },
          cylinderCount: 1,
        });
      expect(firstRes.status).toBe(201);

      // 2. Place a second order
      const secondRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress: { line1: '123 CP', city: 'Delhi', state: 'Delhi', pincode: '110001' },
          cylinderCount: 1,
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.message).toMatch(/already booked a cylinder/i);
    });

    it('should allow placing a new order if the previous order in the last 25 days was cancelled', async () => {
      // 1. Place an order
      const firstRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress: { line1: '123 CP', city: 'Delhi', state: 'Delhi', pincode: '110001' },
          cylinderCount: 1,
        });
      expect(firstRes.status).toBe(201);
      const orderId = firstRes.body.data.orderId;

      // 2. Cancel the order
      const cancelRes = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Customer cancel' });
      expect(cancelRes.status).toBe(200);

      // 3. Place a new order — should be allowed now
      const secondRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          warehouseId: warehouse._id,
          deliveryAddress: { line1: '123 CP', city: 'Delhi', state: 'Delhi', pincode: '110001' },
          cylinderCount: 1,
        });

      expect(secondRes.status).toBe(201);
    });
  });
});
