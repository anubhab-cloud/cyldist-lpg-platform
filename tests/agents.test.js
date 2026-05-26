'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/modules/users/user.model');
const Order = require('../src/modules/orders/order.model');
const Inventory = require('../src/modules/inventory/inventory.model');

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
  return { user, token: res.body.data?.accessToken };
}

async function createWarehouse(adminToken) {
  const warehouseData = {
    warehouseId: `WH-TEST-${Date.now()}`,
    warehouseName: 'Test Warehouse',
    location: { lat: 28.6139, lng: 77.2090 },
    totalCylinders: 100,
    lowStockThreshold: 10,
  };
  const res = await request(app)
    .post('/api/v1/inventory')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(warehouseData);
  return res.body.data;
}

describe('Admin Agent Performance Dashboard API', () => {
  let adminToken, customerToken;
  let agent1, agent2;
  let warehouse;

  beforeEach(async () => {
    // Admin login
    const adminData = await registerAndLogin('admin');
    adminToken = adminData.token;

    // Customer login
    const customerData = await registerAndLogin('customer');
    customerToken = customerData.token;

    // Create agents
    const a1Data = await registerAndLogin('agent');
    agent1 = a1Data.user;

    const a2Data = await registerAndLogin('agent');
    agent2 = a2Data.user;

    // Create warehouse
    warehouse = await createWarehouse(adminToken);
  });

  const deliveryAddress = {
    line1: '123 E2E Street',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  };

  it('should calculate live completed and active delivery counts for agents', async () => {
    // 1. Create a delivered order assigned to Agent 1
    const order1 = await Order.create({
      customerId: new mongoose.Types.ObjectId(),
      agentId: agent1._id,
      warehouseId: warehouse._id,
      deliveryAddress,
      cylinderCount: 1,
      status: 'delivered',
      pricePerCylinder: 850,
      totalAmount: 850,
      deliveredAt: new Date(),
    });

    // 2. Create an active (assigned) order assigned to Agent 1
    const order2 = await Order.create({
      customerId: new mongoose.Types.ObjectId(),
      agentId: agent1._id,
      warehouseId: warehouse._id,
      deliveryAddress,
      cylinderCount: 2,
      status: 'assigned',
      pricePerCylinder: 850,
      totalAmount: 1700,
    });

    // 3. Create a cancelled order assigned to Agent 1
    const order3 = await Order.create({
      customerId: new mongoose.Types.ObjectId(),
      agentId: agent1._id,
      warehouseId: warehouse._id,
      deliveryAddress,
      cylinderCount: 1,
      status: 'cancelled',
      pricePerCylinder: 850,
      totalAmount: 850,
    });

    // Query performance analytics as admin
    const res = await request(app)
      .get('/api/v1/users/agents/performance')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const performance = res.body.data;
    expect(performance.length).toBeGreaterThanOrEqual(2);

    const stats1 = performance.find(p => p.id.toString() === agent1._id.toString());
    expect(stats1).toBeDefined();
    expect(stats1.completedCount).toBe(1);
    expect(stats1.activeCount).toBe(1);
    expect(stats1.cancelledCount).toBe(1);
    // Success rate = (completed / (completed + cancelled)) * 100 = (1 / 2) * 100 = 50%
    expect(stats1.successRate).toBe(50);
    expect(stats1.rating).toBe(4.7); // 1 completed delivery gives 4.7 baseline rating

    const stats2 = performance.find(p => p.id.toString() === agent2._id.toString());
    expect(stats2).toBeDefined();
    expect(stats2.completedCount).toBe(0);
    expect(stats2.activeCount).toBe(0);
    expect(stats2.cancelledCount).toBe(0);
    expect(stats2.successRate).toBe(100); // 100% default
  });

  it('should block non-admin users from accessing performance metrics', async () => {
    const res = await request(app)
      .get('/api/v1/users/agents/performance')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });
});
