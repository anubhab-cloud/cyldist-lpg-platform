'use strict';

/**
 * Seed script to create a full delivery flow for map testing:
 * 1. Customer user (with address in Bengaluru)
 * 2. Agent user (on duty, with location)
 * 3. Inventory/warehouse
 * 4. Order assigned to agent, status = out_for_delivery (so map shows)
 * 
 * After running: 
 *   - Login as customer: testcustomer@test.com / Test@12345
 *   - Login as agent: testagent@test.com / Test@12345
 *   - Customer can track the order; Agent can start GPS sharing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cylinder_platform';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB:', MONGO_URI);

  const User = require('../src/modules/users/user.model');
  const Order = require('../src/modules/orders/order.model');
  const Inventory = require('../src/modules/inventory/inventory.model');

  const passwordHash = await bcrypt.hash('Test@12345', 12);

  // 1. Create/update Customer
  const customer = await User.findOneAndUpdate(
    { email: 'testcustomer@test.com' },
    {
      name: 'Test Customer',
      email: 'testcustomer@test.com',
      passwordHash,
      role: 'customer',
      phone: '+919876543210',
      isActive: true,
      addresses: [
        {
          label: 'Home',
          line1: '42 MG Road, Indiranagar',
          line2: 'Near Metro Station',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
          location: { lat: 12.9784, lng: 77.6408 },
        },
      ],
      location: { lat: 12.9784, lng: 77.6408 },
    },
    { upsert: true, new: true }
  );
  console.log('✅ Customer created:', customer.email, '| ID:', customer._id);

  // 2. Create/update Agent
  const agent = await User.findOneAndUpdate(
    { email: 'testagent@test.com' },
    {
      name: 'Test Agent',
      email: 'testagent@test.com',
      passwordHash,
      role: 'agent',
      phone: '+919876543211',
      isActive: true,
      isOnDuty: true,
      location: { lat: 12.9716, lng: 77.5946 }, // Starting near Bengaluru center
      addresses: [
        {
          label: 'Warehouse Hub',
          line1: 'Warehouse Complex, Koramangala',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560034',
          location: { lat: 12.9352, lng: 77.6245 },
        },
      ],
    },
    { upsert: true, new: true }
  );
  console.log('✅ Agent created:', agent.email, '| ID:', agent._id);

  // 3. Create/update Inventory (warehouse)
  const warehouse = await Inventory.findOneAndUpdate(
    { warehouseId: 'WH-BENGALURU-01' },
    {
      warehouseId: 'WH-BENGALURU-01',
      warehouseName: 'Bengaluru Central Hub',
      location: { lat: 12.9352, lng: 77.6245 },
      totalCapacity: 500,
      currentStock: 200,
      reservedStock: 10,
      lowStockThreshold: 20,
    },
    { upsert: true, new: true }
  );
  console.log('✅ Warehouse created:', warehouse.warehouseId, '| ID:', warehouse._id);

  // 4. Create the order — status "out_for_delivery" so map is visible
  const orderId = 'ORD-MAP-TEST-' + Date.now().toString(36).toUpperCase();
  const deliveryOtp = '1234'; // Simple OTP for testing

  // Remove any previous test orders to avoid clutter
  await Order.deleteMany({ orderId: { $regex: /^ORD-MAP-TEST/ } });

  const order = await Order.create({
    orderId,
    customerId: customer._id,
    agentId: agent._id,
    warehouseId: warehouse._id,
    deliveryAddress: {
      label: 'Home',
      line1: '42 MG Road, Indiranagar',
      line2: 'Near Metro Station',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      location: { lat: 12.9784, lng: 77.6408 },
    },
    cylinderCount: 2,
    cylinderType: 'Domestic (14.2 kg)',
    pricePerCylinder: 899,
    subTotal: 1798,
    deliveryCharge: 50,
    taxAmount: 0,
    totalAmount: 1848,
    status: 'out_for_delivery',
    paymentMode: 'cod',
    paymentStatus: 'pending',
    priority: 'medium',
    deliveryOtp,
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
    timeline: [
      { status: 'created', timestamp: new Date(Date.now() - 20 * 60 * 1000) },
      { status: 'assigned', timestamp: new Date(Date.now() - 10 * 60 * 1000) },
      { status: 'out_for_delivery', timestamp: new Date() },
    ],
    chatRoomId: orderId,
  });

  console.log('✅ Order created:', order.orderId, '| Status:', order.status);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🎯 MAP TEST DATA READY!');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  📋 Order ID:', orderId);
  console.log('  🔐 Delivery OTP: 1234');
  console.log('');
  console.log('  👤 CUSTOMER LOGIN:');
  console.log('     Email: testcustomer@test.com');
  console.log('     Password: Test@12345');
  console.log('     → Go to: My Orders → Track this order');
  console.log('');
  console.log('  🚴 AGENT LOGIN:');
  console.log('     Email: testagent@test.com');
  console.log('     Password: Test@12345');
  console.log('     → Go to: Active Delivery → Start GPS');
  console.log('');
  console.log('  🗺️  Delivery Route:');
  console.log('     Agent starts at: Bengaluru Center (12.9716, 77.5946)');
  console.log('     Destination: Indiranagar MG Road (12.9784, 77.6408)');
  console.log('');
  console.log('  💡 TIP: Open two browser windows side by side');
  console.log('     - Window 1: Customer tracking view');
  console.log('     - Window 2: Agent delivery view with GPS');
  console.log('═══════════════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('\nDone! MongoDB disconnected.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
