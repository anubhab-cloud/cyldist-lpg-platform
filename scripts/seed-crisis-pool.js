'use strict';

/**
 * Seeds 10 diverse customers into the crisis HOLDING POOL (awaiting_allocation).
 * Does NOT run the batch — just puts them in the queue for admin to run manually.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Order = require('../src/modules/orders/order.model');
const User = require('../src/modules/users/user.model');
const Inventory = require('../src/modules/inventory/inventory.model');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  const passwordHash = await bcrypt.hash('Test@12345', 12);
  const wh = await Inventory.findOne({}).sort({ currentStock: -1 });

  // Set stock to 50 for demo
  await Inventory.findByIdAndUpdate(wh._id, { availableCylinders: 50, currentStock: 50 });
  console.log('✅ Warehouse stock set to 50\n');

  const customers = [
    { name: 'Kamala Hospital', email: 'kamala.hosp@test.com', facilityType: 'medical', days: 38, qty: 8, addr: { line1: 'Kamala Hospital, Vasanth Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', location: { lat: 12.9900, lng: 77.5850 } } },
    { name: 'Sunrise Old Age Home', email: 'sunrise.oldage@test.com', facilityType: 'institutional', days: 42, qty: 5, addr: { line1: 'Sunrise Home, Malleshwaram', city: 'Bengaluru', state: 'Karnataka', pincode: '560003', location: { lat: 12.9960, lng: 77.5710 } } },
    { name: 'Ravi Kumar Family', email: 'ravi.family@test.com', facilityType: 'household', days: 30, qty: 2, addr: { line1: '23 2nd Cross, BTM Layout', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', location: { lat: 12.9160, lng: 77.6100 } } },
    { name: 'Lakshmi Household', email: 'lakshmi.house@test.com', facilityType: 'household', days: 50, qty: 1, addr: { line1: '67 5th Main, Banashankari', city: 'Bengaluru', state: 'Karnataka', pincode: '560070', location: { lat: 12.9250, lng: 77.5460 } } },
    { name: 'Royal Orchid Hotel', email: 'royal.orchid@test.com', facilityType: 'commercial', days: 35, qty: 6, addr: { line1: 'Royal Orchid, Old Airport Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560017', location: { lat: 12.9580, lng: 77.6480 } } },
    { name: 'Chennai Express Restaurant', email: 'chennai.express@test.com', facilityType: 'commercial', days: 5, qty: 4, addr: { line1: 'Chennai Express, Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', location: { lat: 12.9340, lng: 77.6260 } } },
    { name: 'Vidya Nursing Home', email: 'vidya.nursing@test.com', facilityType: 'medical', days: 28, qty: 12, addr: { line1: 'Vidya Nursing Home, RT Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560032', location: { lat: 13.0210, lng: 77.5970 } } },
    { name: 'Suresh PG Hostel', email: 'suresh.pg@test.com', facilityType: 'institutional', days: 15, qty: 3, addr: { line1: 'Suresh PG, Electronic City', city: 'Bengaluru', state: 'Karnataka', pincode: '560100', location: { lat: 12.8440, lng: 77.6630 } } },
    { name: 'Annapurna Mess', email: 'annapurna.mess@test.com', facilityType: 'commercial', days: 22, qty: 2, addr: { line1: 'Annapurna Mess, Vijayanagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560040', location: { lat: 12.9710, lng: 77.5330 } } },
    { name: 'Geeta Devi Residence', email: 'geeta.devi@test.com', facilityType: 'household', days: 8, qty: 1, addr: { line1: 'Geeta Residence, JP Nagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560078', location: { lat: 12.9010, lng: 77.5850 } } },
  ];

  // Clean old awaiting orders
  await Order.deleteMany({ crisisStatus: 'awaiting_allocation' });

  let count = 0;
  for (const c of customers) {
    // Create/update user
    const u = await User.findOneAndUpdate(
      { email: c.email },
      { name: c.name, email: c.email, passwordHash, role: 'customer', phone: `+91980000${1000 + count}`, facilityType: c.facilityType, isActive: true, addresses: [c.addr] },
      { upsert: true, new: true }
    );

    // Create past delivery (refill history — establishes their consumption pattern)
    const pastDate = new Date(Date.now() - c.days * 86400000);
    await Order.create({
      customerId: u._id,
      warehouseId: wh._id,
      deliveryAddress: c.addr,
      cylinderCount: 1,
      status: 'delivered',
      deliveredAt: pastDate,
      createdAt: new Date(pastDate.getTime() - 3600000),
      totalAmount: 900,
      paymentMode: 'cod',
      paymentStatus: 'paid',
      timeline: [{ status: 'delivered', timestamp: pastDate }],
    });

    // Create crisis order → HOLDING POOL (awaiting_allocation)
    await Order.create({
      customerId: u._id,
      warehouseId: wh._id,
      deliveryAddress: c.addr,
      cylinderCount: c.qty,
      status: 'created',
      crisisStatus: 'awaiting_allocation',
      isEmergency: true,
      totalAmount: c.qty * 900,
      paymentMode: 'cod',
      paymentStatus: 'pending',
      timeline: [{ status: 'created', timestamp: new Date() }],
    });

    const emoji = { medical: '🏥', institutional: '🏠', household: '👤', commercial: '🏨' }[c.facilityType];
    console.log(`  ${emoji} ${c.name} (${c.facilityType}) — ${c.qty} cyl — last refill ${c.days} days ago`);
    count++;
  }

  console.log(`\n✅ ${count} orders added to HOLDING POOL (awaiting_allocation)`);
  console.log('   Total requested: ' + customers.reduce((s, c) => s + c.qty, 0) + ' cylinders');
  console.log('   Stock: 50 | Pool (85%): 42 | Reserve (15%): 8');
  console.log('\n👉 Now go to Admin → Crisis Dashboard → "Run Batch" to see the ranking!');
  console.log('   Login: admin@cylinderplatform.com / Admin@123456');

  await mongoose.disconnect();
}

seed().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
