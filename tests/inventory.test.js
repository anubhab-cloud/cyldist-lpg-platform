'use strict';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/modules/users/user.model');

async function loginAsAdmin() {
  const passwordHash = await require('bcryptjs').hash('Admin@123', 10);
  await User.create({
    name: 'Test Admin',
    email: `admin.${Date.now()}@test.com`,
    passwordHash,
    role: 'admin',
  });
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: `admin.${Date.now()}@test.com`, password: 'Admin@123' });
  // Use a fresh admin
  const adminHash = await require('bcryptjs').hash('Admin@123456', 10);
  const admin = await User.create({
    name: 'Admin2',
    email: `admin2.${Date.now()}@test.com`,
    passwordHash: adminHash,
    role: 'admin',
  });
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: admin.email,
    password: 'Admin@123456',
  });
  return loginRes.body.data?.accessToken;
}

/**
 * Inventory API Integration Tests
 */
describe('Inventory API', () => {
  let adminToken;

  beforeEach(async () => {
    adminToken = await loginAsAdmin();
  });

  const warehouseData = () => ({
    warehouseId: `WH-TEST-${Date.now()}`,
    warehouseName: 'Test Warehouse',
    location: { lat: 28.6139, lng: 77.2090 },
    totalCylinders: 100,
    lowStockThreshold: 10,
  });

  // ========================
  // POST /inventory
  // ========================
  describe('POST /api/v1/inventory', () => {
    it('should create a warehouse as admin', async () => {
      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warehouseData());

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('warehouseId');
      expect(res.body.data.availableCylinders).toBe(100);
    });

    it('should return 409 for duplicate warehouseId', async () => {
      const data = warehouseData();
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(data);

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(data);

      expect(res.status).toBe(409);
    });

    it('should return 403 for non-admin users', async () => {
      const customerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Cust', email: `c${Date.now()}@test.com`, password: 'Test@12345' });
      const customerToken = customerRes.body.data.accessToken;

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(warehouseData());

      expect(res.status).toBe(403);
    });
  });

  // ========================
  // GET /inventory
  // ========================
  describe('GET /api/v1/inventory', () => {
    it('should list warehouses with pagination', async () => {
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warehouseData());

      const res = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body).toHaveProperty('pagination');
    });
  });

  // ========================
  // GET /inventory/low-stock
  // ========================
  describe('GET /api/v1/inventory/low-stock', () => {
    it('should return warehouses below low stock threshold', async () => {
      const data = warehouseData();
      data.totalCylinders = 5;
      data.lowStockThreshold = 10;

      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(data);

      const res = await request(app)
        .get('/api/v1/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ========================
  // PATCH /inventory/:id
  // ========================
  describe('PATCH /api/v1/inventory/:id', () => {
    it('should update stock and adjust available cylinders', async () => {
      const createRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(warehouseData());

      const warehouseId = createRes.body.data._id;

      const res = await request(app)
        .patch(`/api/v1/inventory/${warehouseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalCylinders: 150 }); // Restock +50

      expect(res.status).toBe(200);
      expect(res.body.data.totalCylinders).toBe(150);
      expect(res.body.data.availableCylinders).toBe(150); // 100 available + 50 restocked
    });
  });
});
