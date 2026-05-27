const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Load env variables from root
const User = require('../src/modules/users/user.model');
const Order = require('../src/modules/orders/order.model');
const Inventory = require('../src/modules/inventory/inventory.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cylinder_platform';

console.log('[DB Tools] Connecting to:', MONGO_URI);

mongoose.connect(MONGO_URI)
  .then(async () => {
    // 1. Fetch all active or pending crisis orders
    const activeOrders = await Order.find({
      status: { $in: ['awaiting_allocation', 'created', 'assigned', 'out_for_delivery'] }
    }).populate('customerId', 'name email facilityType');

    if (activeOrders.length === 0) {
      console.log('No active or pending orders found.');
      mongoose.disconnect();
      process.exit(0);
    }

    console.log(`\nFound ${activeOrders.length} active/pending orders in database:`);
    activeOrders.forEach(o => {
      console.log(` - Order ID: ${o.orderId} | Status: ${o.status} | Customer: ${o.customerId?.name} (${o.customerId?.facilityType}) | Qty: ${o.cylinderCount}`);
    });

    console.log('\n[DB Tools] Forcing status to "delivered" directly in database...');

    for (const order of activeOrders) {
      const originalStatus = order.status;
      
      // Update order fields
      order.status = 'delivered';
      order.paymentStatus = 'completed';
      order.deliveredCount = order.cylinderCount;
      
      // Append timeline event
      order.timeline.push({
        status: 'delivered',
        note: `Forced delivery bypass. Pre-bypass status: "${originalStatus}". Delivery OTP: ${order.deliveryOtp || 'N/A'}.`,
        updatedAt: new Date()
      });
      
      await order.save();
      console.log(` ✅ Forced Delivery Success: Order ${order.orderId} is now DELIVERED.`);
    }

    console.log('\n[DB Tools] Database operations completed successfully.');
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error executing DB tools:', err);
    process.exit(1);
  });
