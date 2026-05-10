'use strict';

/**
 * Seed script — populates the database with:
 * - 1 Admin user
 * - 2 Delivery agents
 * - 3 Warehouses
 * - 5 Sample customers
 * - 3 Sample orders
 *
 * Usage: npm run seed
 * ⚠ WARNING: This will drop existing data in development/test environments.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = require('../src/config');
const logger = require('../src/config/logger');

const User = require('../src/modules/users/user.model');
const Inventory = require('../src/modules/inventory/inventory.model');
const Order = require('../src/modules/orders/order.model');

async function seed() {
  try {
    logger.info('Connecting to database...');
    await mongoose.connect(config.db.uri);
    logger.info('Connected!');

    // Clear collections
    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Inventory.deleteMany({}),
      Order.deleteMany({}),
    ]);

    // ========================
    // USERS
    // ========================
    logger.info('Seeding users...');

    const adminPasswordHash = await bcrypt.hash(config.admin.password, 12);
    const agentPasswordHash = await bcrypt.hash('Agent@123456', 12);
    const customerPasswordHash = await bcrypt.hash('Customer@123', 12);

    const admin = await User.create({
      name: config.admin.name,
      email: config.admin.email,
      passwordHash: adminPasswordHash,
      phone: config.admin.phone,
      role: 'admin',
      isActive: true,
    });

    const agents = await User.insertMany([
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.agent@cylinderplatform.com',
        passwordHash: agentPasswordHash,
        phone: '+919876543210',
        role: 'agent',
        isActive: true,
        isOnDuty: true,
        location: { lat: 28.6139, lng: 77.2090 },
      },
      {
        name: 'Priya Singh',
        email: 'priya.agent@cylinderplatform.com',
        passwordHash: agentPasswordHash,
        phone: '+919876543211',
        role: 'agent',
        isActive: true,
        isOnDuty: true,
        location: { lat: 28.5355, lng: 77.3910 },
      },
    ]);

    const customers = await User.insertMany([
      {
        name: 'Amit Sharma',
        email: 'amit@example.com',
        passwordHash: customerPasswordHash,
        phone: '+919111111111',
        role: 'customer',
        addresses: [{
          label: 'Home',
          line1: '123, Sector 15',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
          location: { lat: 28.5851, lng: 77.3149 },
        }],
      },
      {
        name: 'Sunita Verma',
        email: 'sunita@example.com',
        passwordHash: customerPasswordHash,
        phone: '+919222222222',
        role: 'customer',
        addresses: [{
          label: 'Home',
          line1: '456, MG Road',
          city: 'Gurgaon',
          state: 'Haryana',
          pincode: '122001',
        }],
      },
      {
        name: 'Vikram Patel',
        email: 'vikram@example.com',
        passwordHash: customerPasswordHash,
        phone: '+919333333333',
        role: 'customer',
        addresses: [{
          label: 'Home',
          line1: '789, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          location: { lat: 28.6315, lng: 77.2167 },
        }],
      },
    ]);

    // ========================
    // INVENTORY (WAREHOUSES)
    // ========================
    logger.info('Seeding inventory...');

    const warehouses = await Inventory.insertMany([
      {
        warehouseId: 'WH-DELHI-01',
        warehouseName: 'Central Delhi Warehouse',
        location: { lat: 28.6139, lng: 77.2090 },
        totalCylinders: 500,
        availableCylinders: 450,
        reservedCylinders: 0,
        lowStockThreshold: 50,
        isActive: true,
        lastRestockedAt: new Date(),
        lastRestockedBy: admin._id,
      },
      {
        warehouseId: 'WH-NOIDA-01',
        warehouseName: 'Noida Sector 18 Warehouse',
        location: { lat: 28.5706, lng: 77.3219 },
        totalCylinders: 300,
        availableCylinders: 285,
        reservedCylinders: 0,
        lowStockThreshold: 30,
        isActive: true,
        lastRestockedAt: new Date(),
        lastRestockedBy: admin._id,
      },
      {
        warehouseId: 'WH-GGN-01',
        warehouseName: 'Gurgaon DLF Warehouse',
        location: { lat: 28.4698, lng: 77.0301 },
        totalCylinders: 200,
        availableCylinders: 8, // Low stock for testing
        reservedCylinders: 0,
        lowStockThreshold: 10,
        isActive: true,
        lastRestockedAt: new Date(),
        lastRestockedBy: admin._id,
      },
    ]);

    // ========================
    // ORDERS
    // ========================
    logger.info('Seeding orders...');

    await Order.insertMany([
      {
        customerId: customers[0]._id,
        agentId: agents[0]._id,
        warehouseId: warehouses[0]._id,
        deliveryAddress: customers[0].addresses[0],
        cylinderCount: 2,
        status: 'out_for_delivery',
        pricePerCylinder: 850,
        totalAmount: 1700,
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
          { status: 'assigned', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          { status: 'out_for_delivery', timestamp: new Date(Date.now() - 30 * 60 * 1000) },
        ],
        estimatedDeliveryTime: new Date(Date.now() + 60 * 60 * 1000),
      },
      {
        customerId: customers[1]._id,
        warehouseId: warehouses[1]._id,
        deliveryAddress: customers[1].addresses[0],
        cylinderCount: 1,
        status: 'created',
        pricePerCylinder: 850,
        totalAmount: 850,
        timeline: [
          { status: 'created', timestamp: new Date() },
        ],
      },
      {
        customerId: customers[2]._id,
        agentId: agents[1]._id,
        warehouseId: warehouses[0]._id,
        deliveryAddress: customers[2].addresses[0],
        cylinderCount: 3,
        status: 'delivered',
        pricePerCylinder: 850,
        totalAmount: 2550,
        deliveredAt: new Date(Date.now() - 60 * 60 * 1000),
        timeline: [
          { status: 'created', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) },
          { status: 'assigned', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) },
          { status: 'out_for_delivery', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
          { status: 'delivered', timestamp: new Date(Date.now() - 60 * 60 * 1000) },
        ],
      },
    ]);

    logger.info('');
    logger.info('✅ Seed completed successfully!');
    logger.info('');
    logger.info('=== SEED CREDENTIALS ===');
    logger.info(`Admin:    ${config.admin.email} / ${config.admin.password}`);
    logger.info(`Agent 1:  rajesh.agent@cylinderplatform.com / Agent@123456`);
    logger.info(`Agent 2:  priya.agent@cylinderplatform.com / Agent@123456`);
    logger.info(`Customer: amit@example.com / Customer@123`);
    logger.info('========================');
    logger.info('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', { error: err.message, stack: err.stack });
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
