'use strict';

/**
 * Seed script — populates the database with 30 demo orders
 * spread across the last 7 days for dashboard analytics testing.
 *
 * Does NOT clear existing data — appends new orders using
 * existing users and warehouses from the DB.
 *
 * Usage: node scripts/seed-demo-dashboard.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../src/modules/orders/order.model');
const User = require('../src/modules/users/user.model');
const Inventory = require('../src/modules/inventory/inventory.model');

// --- Helpers ---
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomBetween(8, 20), randomBetween(0, 59), 0, 0);
  if (hoursOffset) d.setHours(d.getHours() + hoursOffset);
  return d;
}

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected!\n');

    // --- Fetch existing entities ---
    const customer = await User.findOne({ role: 'customer' });
    if (!customer) {
      console.error('❌ No customer found in DB. Run the main seed first: npm run seed');
      process.exit(1);
    }

    const agents = await User.find({ role: 'agent' }).limit(5);
    if (agents.length === 0) {
      console.error('❌ No agents found in DB. Run the main seed first: npm run seed');
      process.exit(1);
    }

    const warehouse = await Inventory.findOne({ isActive: true });
    if (!warehouse) {
      console.error('❌ No warehouse found in DB. Run the main seed first: npm run seed');
      process.exit(1);
    }

    console.log(`📦 Using customer: ${customer.name} (${customer.email})`);
    console.log(`🚚 Using ${agents.length} agent(s): ${agents.map((a) => a.name).join(', ')}`);
    console.log(`🏭 Using warehouse: ${warehouse.warehouseName}\n`);

    // --- Order distribution ---
    // 8 delivered, 6 out_for_delivery, 5 assigned, 8 created, 3 cancelled = 30
    const statusDistribution = [
      ...Array(8).fill('delivered'),
      ...Array(6).fill('out_for_delivery'),
      ...Array(5).fill('assigned'),
      ...Array(8).fill('created'),
      ...Array(3).fill('cancelled'),
    ];

    const priorities = ['urgent', 'medium', 'normal'];
    const priorityWeights = [
      ...Array(5).fill('urgent'),
      ...Array(10).fill('medium'),
      ...Array(15).fill('normal'),
    ];

    const addresses = [
      { label: 'Home', line1: '12, Sector 44', city: 'Noida', state: 'Uttar Pradesh', pincode: '201303', location: { lat: 28.5535, lng: 77.3315 } },
      { label: 'Office', line1: '45, Connaught Place', city: 'New Delhi', state: 'Delhi', pincode: '110001', location: { lat: 28.6315, lng: 77.2167 } },
      { label: 'Home', line1: '78, DLF Phase 3', city: 'Gurgaon', state: 'Haryana', pincode: '122002', location: { lat: 28.4820, lng: 77.0930 } },
      { label: 'Home', line1: '33, Lajpat Nagar', city: 'New Delhi', state: 'Delhi', pincode: '110024', location: { lat: 28.5700, lng: 77.2400 } },
      { label: 'Office', line1: '56, Nehru Place', city: 'New Delhi', state: 'Delhi', pincode: '110019', location: { lat: 28.5494, lng: 77.2530 } },
    ];

    // Shuffle status distribution
    for (let i = statusDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statusDistribution[i], statusDistribution[j]] = [statusDistribution[j], statusDistribution[i]];
    }

    const orders = [];

    for (let i = 0; i < 30; i++) {
      const status = statusDistribution[i];
      const dayOffset = randomBetween(0, 6); // spread across last 7 days
      const createdAt = daysAgo(dayOffset);
      const amount = randomBetween(800, 2000);
      const cylinderCount = randomBetween(1, 4);
      const priority = randomFromArray(priorityWeights);
      const address = randomFromArray(addresses);
      const agent = randomFromArray(agents);

      // Build timeline based on status
      const timeline = [{ status: 'created', timestamp: createdAt }];
      let agentId = null;
      let deliveredAt = null;
      let estimatedDeliveryTime = null;

      if (['assigned', 'out_for_delivery', 'delivered', 'cancelled'].includes(status)) {
        const assignedAt = new Date(createdAt.getTime() + randomBetween(15, 90) * 60000);
        timeline.push({ status: 'assigned', timestamp: assignedAt });
        agentId = agent._id;
        estimatedDeliveryTime = new Date(assignedAt.getTime() + randomBetween(30, 120) * 60000);
      }

      if (['out_for_delivery', 'delivered'].includes(status)) {
        const ofdAt = new Date(timeline[timeline.length - 1].timestamp.getTime() + randomBetween(10, 60) * 60000);
        timeline.push({ status: 'out_for_delivery', timestamp: ofdAt });
      }

      if (status === 'delivered') {
        const deliverAt = new Date(timeline[timeline.length - 1].timestamp.getTime() + randomBetween(20, 90) * 60000);
        timeline.push({ status: 'delivered', timestamp: deliverAt });
        deliveredAt = deliverAt;
      }

      if (status === 'cancelled') {
        const cancelAt = new Date(timeline[timeline.length - 1].timestamp.getTime() + randomBetween(5, 30) * 60000);
        timeline.push({ status: 'cancelled', timestamp: cancelAt, note: 'Customer requested cancellation' });
      }

      orders.push({
        customerId: customer._id,
        agentId,
        warehouseId: warehouse._id,
        deliveryAddress: address,
        cylinderCount,
        status,
        priority,
        pricePerCylinder: Math.round(amount / cylinderCount),
        totalAmount: amount,
        paymentMode: randomFromArray(['cod', 'upi', 'online']),
        paymentStatus: status === 'delivered' ? 'paid' : 'pending',
        timeline,
        estimatedDeliveryTime,
        deliveredAt,
        rating: status === 'delivered' ? randomBetween(3, 5) : null,
        createdAt,
        updatedAt: timeline[timeline.length - 1].timestamp,
      });
    }

    // Insert all orders
    const inserted = await Order.insertMany(orders);
    console.log(`✅ Inserted ${inserted.length} demo orders!\n`);

    // Summary
    const summary = {};
    inserted.forEach((o) => {
      summary[o.status] = (summary[o.status] || 0) + 1;
    });
    console.log('📊 Status breakdown:');
    Object.entries(summary).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    const prioritySummary = {};
    inserted.forEach((o) => {
      prioritySummary[o.priority] = (prioritySummary[o.priority] || 0) + 1;
    });
    console.log('\n🎯 Priority breakdown:');
    Object.entries(prioritySummary).forEach(([p, count]) => {
      console.log(`   ${p}: ${count}`);
    });

    console.log('\n✅ Demo dashboard seed complete!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed().then(() => process.exit(0));
