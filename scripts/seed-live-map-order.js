'use strict';
const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../src/modules/orders/order.model');
const User = require('../src/modules/users/user.model');
const Inventory = require('../src/modules/inventory/inventory.model');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const cust = await User.findOne({ email: 'testcustomer@test.com' });
  const agent = await User.findOne({ email: 'testagent@test.com' });
  const wh = await Inventory.findOne({}).sort({ currentStock: -1 });

  if (!cust || !agent) {
    console.log('Missing testcustomer or testagent. Run seed-map-test.js first.');
    process.exit(1);
  }

  // Delete old map test orders
  await Order.deleteMany({ orderId: /^ORD-LIVE-MAP/ });

  const orderId = 'ORD-LIVE-MAP-' + Date.now().toString(36).toUpperCase();

  await Order.create({
    orderId,
    customerId: cust._id,
    agentId: agent._id,
    warehouseId: wh._id,
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
    totalAmount: 1798,
    status: 'out_for_delivery',
    paymentMode: 'cod',
    paymentStatus: 'pending',
    priority: 'medium',
    deliveryOtp: '4321',
    estimatedDeliveryTime: new Date(Date.now() + 30 * 60 * 1000),
    timeline: [
      { status: 'created', timestamp: new Date(Date.now() - 15 * 60000) },
      { status: 'assigned', timestamp: new Date(Date.now() - 10 * 60000) },
      { status: 'out_for_delivery', timestamp: new Date() },
    ],
  });

  console.log('═══════════════════════════════════════════════');
  console.log('  LIVE MAP TEST ORDER CREATED');
  console.log('═══════════════════════════════════════════════');
  console.log('');
  console.log('  Order:', orderId);
  console.log('  Status: out_for_delivery (map visible)');
  console.log('  Delivery OTP: 4321');
  console.log('');
  console.log('  CUSTOMER (Window 1):');
  console.log('    Login: testcustomer@test.com / Test@12345');
  console.log('    Go to: My Orders → Track this order');
  console.log('    You will see: Live map + OTP banner');
  console.log('');
  console.log('  AGENT (Window 2):');
  console.log('    Login: testagent@test.com / Test@12345');
  console.log('    Go to: Dashboard → Active delivery');
  console.log('    Click: "▶ Start GPS" button');
  console.log('    Map shows: Agent moving toward destination');
  console.log('');
  console.log('  Route: Bengaluru Center → Indiranagar MG Road');
  console.log('═══════════════════════════════════════════════');

  await mongoose.disconnect();
});
