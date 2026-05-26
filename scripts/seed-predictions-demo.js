'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = require('../src/config');
const User = require('../src/modules/users/user.model');
const Inventory = require('../src/modules/inventory/inventory.model');
const Order = require('../src/modules/orders/order.model');

async function runDemoSeed() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.db.uri);
    console.log('Connected!');

    // 1. Find or create the customer: amit@example.com
    let user = await User.findOne({ email: 'amit@example.com' });
    if (!user) {
      console.log('Creating customer amit@example.com...');
      const passwordHash = await bcrypt.hash('Customer@123', 12);
      user = await User.create({
        name: 'Amit Sharma',
        email: 'amit@example.com',
        passwordHash,
        phone: '+919111111111',
        role: 'customer',
        kycStatus: 'verified',
        addresses: [{
          label: 'Home',
          line1: '123, Sector 15',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
          location: { lat: 28.5851, lng: 77.3149 },
        }],
      });
    } else {
      console.log('Customer amit@example.com exists. Verifying KYC status...');
      user.kycStatus = 'verified';
      await user.save();
    }

    // 2. Find central warehouse
    let warehouse = await Inventory.findOne({ warehouseId: 'WH-DELHI-01' });
    if (!warehouse) {
      console.log('Creating Central Delhi Warehouse...');
      warehouse = await Inventory.create({
        warehouseId: 'WH-DELHI-01',
        warehouseName: 'Central Delhi Warehouse',
        location: { lat: 28.6139, lng: 77.2090 },
        totalCylinders: 500,
        availableCylinders: 450,
        reservedCylinders: 0,
        lowStockThreshold: 50,
        isActive: true,
        lastRestockedAt: new Date(),
      });
    }

    // 3. Clear existing orders for Amit Sharma
    console.log('Clearing old orders for Amit Sharma...');
    await Order.deleteMany({ customerId: user._id });

    // 4. Create calibrated historical orders
    console.log('Seeding calibrated historical delivered orders...');
    const now = new Date();
    
    // Order 1: 40 days ago
    const date40DaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
    // Order 2: 15 days ago
    const date15DaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const orders = [
      {
        orderId: `ORD-${Date.now()}-1`,
        customerId: user._id,
        warehouseId: warehouse._id,
        deliveryAddress: user.addresses[0],
        cylinderCount: 1,
        status: 'delivered',
        pricePerCylinder: 850,
        totalAmount: 850,
        createdAt: date40DaysAgo,
        deliveredAt: date40DaysAgo,
        timeline: [
          { status: 'created', timestamp: date40DaysAgo },
          { status: 'assigned', timestamp: date40DaysAgo },
          { status: 'out_for_delivery', timestamp: date40DaysAgo },
          { status: 'delivered', timestamp: date40DaysAgo },
        ],
      },
      {
        orderId: `ORD-${Date.now()}-2`,
        customerId: user._id,
        warehouseId: warehouse._id,
        deliveryAddress: user.addresses[0],
        cylinderCount: 1,
        status: 'delivered',
        pricePerCylinder: 850,
        totalAmount: 850,
        createdAt: date15DaysAgo,
        deliveredAt: date15DaysAgo,
        timeline: [
          { status: 'created', timestamp: date15DaysAgo },
          { status: 'assigned', timestamp: date15DaysAgo },
          { status: 'out_for_delivery', timestamp: date15DaysAgo },
          { status: 'delivered', timestamp: date15DaysAgo },
        ],
      }
    ];

    await Order.insertMany(orders);

    console.log('\n======================================================');
    console.log('✅ Demo Smart Refill prediction seeding completed!');
    console.log('======================================================');
    console.log('Test Account Credentials:');
    console.log('Email:    amit@example.com');
    console.log('Password: Customer@123');
    console.log('------------------------------------------------------');
    console.log('Prediction Metrics Configured:');
    console.log('- Order 1: 40 Days Ago');
    console.log('- Order 2: 15 Days Ago');
    console.log('- Consumption Cycle: 25 Days (Average)');
    console.log('- Elapsed Since Last: 15 Days');
    console.log('- Expected Display: "60% Consumed" with 10 Days Left');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Demo seeding failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runDemoSeed();
