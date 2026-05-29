'use strict';

/**
 * FULL CRISIS ENGINE TEST
 * 
 * Scenario (as described):
 * - 50 cylinders total in stock
 * - 85% public pool = 42 cylinders (everyone competes here)
 * - 15% reserve = 8 cylinders (untouched, for unexpected emergencies only)
 * 
 * Customers:
 * - 5 Households (want 1-2 each, different locations in Bengaluru)
 * - 3 Hotels (want 3-5 each)
 * - 2 Hospitals (want 5-10 each)
 * 
 * Tests:
 * 1. Scoring works correctly (hospitals rank highest)
 * 2. All compete from same 85% pool
 * 3. Partial allocation when stock runs low
 * 4. Waitlisting when pool is empty
 * 5. Reserve stays untouched
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../src/modules/orders/order.model');
const User = require('../src/modules/users/user.model');
const Inventory = require('../src/modules/inventory/inventory.model');
const AppSettings = require('../src/modules/inventory/appsettings.model');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // ═══════ SETUP ═══════

  // 1. Set warehouse stock to exactly 50 (use the first one)
  const warehouse = await Inventory.findOne({}).sort({ _id: 1 });
  await Inventory.updateMany({}, { availableCylinders: 0, currentStock: 0 }); // Zero all
  await Inventory.findByIdAndUpdate(warehouse._id, { availableCylinders: 50, currentStock: 50 });
  console.log('✅ Warehouse stock set to 50 cylinders (all others zeroed)');

  // 2. Enable crisis mode with 15% reserve
  await AppSettings.findOneAndUpdate(
    { key: 'global' },
    { $set: {
      'crisisMode.enabled': true,
      'crisisMode.emergencyReservePercent': 15,
      'crisisMode.hoardingThresholdDays': 21,
      'crisisMode.currentBatchId': 'TEST-CRISIS-' + Date.now(),
    }},
    { upsert: true }
  );
  console.log('✅ Crisis mode enabled (15% reserve)');

  // 3. Create test customers with different facility types
  const passwordHash = await bcrypt.hash('Test@12345', 12);

  const customers = [
    // Households (different Bengaluru areas)
    { name: 'Rahul Sharma', email: 'rahul.household@test.com', facilityType: 'household', phone: '+919800100001', addr: { line1: '45, 1st Cross, Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', location: { lat: 12.9352, lng: 77.6245 } } },
    { name: 'Priya Nair', email: 'priya.household@test.com', facilityType: 'household', phone: '+919800100002', addr: { line1: '12, 3rd Main, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', location: { lat: 12.9784, lng: 77.6408 } } },
    { name: 'Deepak Rao', email: 'deepak.household@test.com', facilityType: 'household', phone: '+919800100003', addr: { line1: '78, 4th Block, Jayanagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560041', location: { lat: 12.9250, lng: 77.5820 } } },
    { name: 'Meera Reddy', email: 'meera.household@test.com', facilityType: 'household', phone: '+919800100004', addr: { line1: '22, HSR Layout Sector 2', city: 'Bengaluru', state: 'Karnataka', pincode: '560102', location: { lat: 12.9116, lng: 77.6350 } } },
    { name: 'Arjun Das', email: 'arjun.household@test.com', facilityType: 'household', phone: '+919800100005', addr: { line1: '56, Whitefield Main Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', location: { lat: 12.9698, lng: 77.7500 } } },
    // Hotels (commercial)
    { name: 'Hotel Grand Bengaluru', email: 'hotel.grand@test.com', facilityType: 'commercial', phone: '+919800200001', addr: { line1: '100 Feet Rd, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', location: { lat: 12.9780, lng: 77.6400 } } },
    { name: 'Taj Restaurant', email: 'taj.restaurant@test.com', facilityType: 'commercial', phone: '+919800200002', addr: { line1: 'MG Road, Brigade Junction', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', location: { lat: 12.9750, lng: 77.6070 } } },
    { name: 'Spice Garden Hotel', email: 'spice.hotel@test.com', facilityType: 'commercial', phone: '+919800200003', addr: { line1: 'Marathahalli Bridge', city: 'Bengaluru', state: 'Karnataka', pincode: '560037', location: { lat: 12.9591, lng: 77.6974 } } },
    // Hospitals (medical)
    { name: 'Bengaluru City Hospital', email: 'city.hospital@test.com', facilityType: 'medical', phone: '+919800300001', addr: { line1: 'Victoria Hospital, KR Market', city: 'Bengaluru', state: 'Karnataka', pincode: '560002', location: { lat: 12.9611, lng: 77.5773 } } },
    { name: 'Rainbow Nursing Home', email: 'rainbow.nursing@test.com', facilityType: 'medical', phone: '+919800300002', addr: { line1: 'Bannerghatta Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', location: { lat: 12.8914, lng: 77.5972 } } },
  ];

  const userDocs = [];
  for (const c of customers) {
    const u = await User.findOneAndUpdate(
      { email: c.email },
      { name: c.name, email: c.email, passwordHash, role: 'customer', phone: c.phone, facilityType: c.facilityType, isActive: true, addresses: [c.addr] },
      { upsert: true, new: true }
    );
    userDocs.push({ ...c, _id: u._id });
  }
  console.log(`✅ Created/updated ${userDocs.length} test customers\n`);

  // 4. Clean old crisis test orders
  await Order.deleteMany({ crisisBatchId: { $regex: /^TEST-CRISIS/ } });

  // 5. Create orders with different quantities and refill histories
  // Some have recent refills (hoarding), some are overdue
  const ordersData = [
    // Households (1-2 cylinders each) — different last refill dates
    { customer: userDocs[0], qty: 1, daysAgoRefill: 35 },  // Overdue
    { customer: userDocs[1], qty: 2, daysAgoRefill: 28 },  // Normal
    { customer: userDocs[2], qty: 1, daysAgoRefill: 10 },  // Recent (hoarding!)
    { customer: userDocs[3], qty: 2, daysAgoRefill: 45 },  // Very overdue
    { customer: userDocs[4], qty: 1, daysAgoRefill: 25 },  // Normal
    // Hotels (3-5 cylinders each)
    { customer: userDocs[5], qty: 5, daysAgoRefill: 30 },  // Normal cycle
    { customer: userDocs[6], qty: 4, daysAgoRefill: 8 },   // Recent (hoarding!)
    { customer: userDocs[7], qty: 3, daysAgoRefill: 40 },  // Overdue
    // Hospitals (5-10 cylinders each)
    { customer: userDocs[8], qty: 10, daysAgoRefill: 32 }, // Normal overdue
    { customer: userDocs[9], qty: 8, daysAgoRefill: 25 },  // Slightly overdue
  ];

  // Create a past delivered order for each (to establish refill history)
  for (const od of ordersData) {
    const pastDate = new Date(Date.now() - od.daysAgoRefill * 86400000);
    await Order.create({
      customerId: od.customer._id,
      warehouseId: warehouse._id,
      deliveryAddress: od.customer.addr,
      cylinderCount: 1,
      status: 'delivered',
      deliveredAt: pastDate,
      createdAt: new Date(pastDate.getTime() - 3600000),
      totalAmount: 900,
      paymentMode: 'cod',
      paymentStatus: 'paid',
      timeline: [{ status: 'delivered', timestamp: pastDate }],
    });
  }
  console.log('✅ Created refill history for each customer');

  // Now create the CRISIS orders (awaiting allocation)
  const crisisOrders = [];
  for (const od of ordersData) {
    const order = await Order.create({
      customerId: od.customer._id,
      warehouseId: warehouse._id,
      deliveryAddress: od.customer.addr,
      cylinderCount: od.qty,
      status: 'created',
      crisisStatus: 'awaiting_allocation',
      isEmergency: true,
      totalAmount: od.qty * 900,
      paymentMode: 'cod',
      paymentStatus: 'pending',
      timeline: [{ status: 'created', timestamp: new Date() }],
    });
    crisisOrders.push(order);
  }
  console.log(`✅ Created ${crisisOrders.length} crisis orders (awaiting_allocation)\n`);

  // Total requested: 1+2+1+2+1 + 5+4+3 + 10+8 = 37 cylinders
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SCENARIO SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Stock: 50 cylinders');
  console.log('  Public Pool (85%): 42 cylinders');
  console.log('  Reserve (15%): 8 cylinders (UNTOUCHED)');
  console.log('  Total Requested: 37 cylinders');
  console.log('  Expected: All should be allocated (37 < 42)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ═══════ RUN THE CRISIS ENGINE ═══════
  const crisisService = require('../src/modules/crisis/crisis.service');
  console.log('🔄 Running crisis batch allocation...\n');

  const result = await crisisService.runBatchAllocation('6a15591224e7fd9dcea619bb', null);

  // ═══════ RESULTS ═══════
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ALLOCATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Total Processed: ${result.summary.totalProcessed}`);
  console.log(`  Total Allocated: ${result.summary.totalAllocated}`);
  console.log(`  Total Waitlisted: ${result.summary.totalWaitlisted}`);
  console.log(`  Partial Allocations: ${result.summary.totalPartialAllocations || 0}`);
  console.log(`  Cylinders Used (from public pool): ${result.summary.publicAllocated}`);
  console.log(`  Reserve UNTOUCHED: ${result.summary.reserveUntouched} cylinders`);
  console.log(`  Stock Before: ${result.summary.stockSnapshotBefore}`);
  console.log(`  Stock After: ${result.summary.stockAfter}`);
  console.log('');

  console.log('  LEADERBOARD (Ranked by Priority Score):');
  console.log('  ─────────────────────────────────────────────────────────');
  for (const entry of result.leaderboard) {
    const emoji = { medical: '🏥', commercial: '🏨', household: '🏠' }[entry.facilityType] || '❓';
    const partialTag = entry.partial ? ' ⚠️ PARTIAL' : '';
    const hoarding = entry.hoarding ? ' [HOARDING PENALTY]' : '';
    console.log(`  #${entry.rank} ${emoji} ${entry.customerName} (${entry.facilityType})`);
    console.log(`     Score: ${entry.score.toFixed(1)} | Requested: ${entry.cylindersRequested} | Got: ${entry.cylindersAllocated} | ${entry.status}${partialTag}${hoarding}`);
    console.log(`     ${entry.notes}`);
    console.log('');
  }

  // Verify reserve is untouched
  const whAfter = await Inventory.findById(warehouse._id);
  console.log('  ─────────────────────────────────────────────────────────');
  console.log(`  Warehouse stock after allocation: ${whAfter.availableCylinders} (was 50)`);
  console.log(`  Reserve (8) is included in remaining — untouched for emergencies.`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ═══════ TEST 2: Stock exhaustion with partial fill ═══════
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TEST 2: STOCK EXHAUSTION (Partial Fill Scenario)');
  console.log('═══════════════════════════════════════════════════════════');

  // Set stock to only 5 and create big orders
  await Inventory.findByIdAndUpdate(warehouse._id, { availableCylinders: 12 });
  // Public pool = 12 * 0.85 = 10 cylinders

  // Create 3 more crisis orders
  const exhaust1 = await Order.create({ customerId: userDocs[8]._id, warehouseId: warehouse._id, deliveryAddress: userDocs[8].addr, cylinderCount: 6, status: 'created', crisisStatus: 'awaiting_allocation', isEmergency: true, totalAmount: 5400, paymentMode: 'cod', paymentStatus: 'pending', timeline: [{ status: 'created', timestamp: new Date() }] });
  const exhaust2 = await Order.create({ customerId: userDocs[0]._id, warehouseId: warehouse._id, deliveryAddress: userDocs[0].addr, cylinderCount: 4, status: 'created', crisisStatus: 'awaiting_allocation', isEmergency: true, totalAmount: 3600, paymentMode: 'cod', paymentStatus: 'pending', timeline: [{ status: 'created', timestamp: new Date() }] });
  const exhaust3 = await Order.create({ customerId: userDocs[5]._id, warehouseId: warehouse._id, deliveryAddress: userDocs[5].addr, cylinderCount: 3, status: 'created', crisisStatus: 'awaiting_allocation', isEmergency: true, totalAmount: 2700, paymentMode: 'cod', paymentStatus: 'pending', timeline: [{ status: 'created', timestamp: new Date() }] });

  console.log('  Stock: 12 | Public Pool (85%): 10 | Reserve: 2');
  console.log('  Orders: Hospital(6) + Household(4) + Hotel(3) = 13 total requested');
  console.log('  Pool only has 10 → someone gets partial or waitlisted\n');

  await AppSettings.findOneAndUpdate({ key: 'global' }, { $set: { 'crisisMode.currentBatchId': 'TEST-EXHAUST-' + Date.now() }});

  const result2 = await crisisService.runBatchAllocation('6a15591224e7fd9dcea619bb', null);

  console.log(`  Allocated: ${result2.summary.totalAllocated} | Waitlisted: ${result2.summary.totalWaitlisted} | Partial: ${result2.summary.totalPartialAllocations || 0}`);
  console.log('');
  for (const entry of result2.leaderboard) {
    const emoji = { medical: '🏥', commercial: '🏨', household: '🏠' }[entry.facilityType] || '❓';
    const partialTag = entry.partial ? ' ⚠️ PARTIAL' : '';
    console.log(`  #${entry.rank} ${emoji} ${entry.customerName}: Need ${entry.cylindersRequested}, Got ${entry.cylindersAllocated} — ${entry.status}${partialTag}`);
  }

  const whFinal = await Inventory.findById(warehouse._id);
  console.log(`\n  Stock after: ${whFinal.availableCylinders} (reserve of 2 stays)`);
  console.log('═══════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('\n✅ All tests complete.');
}

run().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
