const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const dbUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/cylinder_platform';

async function main() {
  try {
    console.log('Connecting to database:', dbUrl);
    await mongoose.connect(dbUrl);
    console.log('Successfully connected to MongoDB');

    // Load User and Inventory schemas and models dynamically to avoid duplicate declaration conflicts
    const User = mongoose.model('User');
    const Inventory = mongoose.model('Inventory');
    const Order = mongoose.model('Order');

    // 1. Find Amit Sharma (customer)
    const customer = await User.findOne({ name: /Amit/i, role: 'customer' });
    if (!customer) {
      console.error('ERROR: Could not find customer named Amit Sharma.');
      const allCustomers = await User.find({ role: 'customer' }).limit(5);
      console.log('Available customers:', allCustomers.map(c => ({ id: c._id, name: c.name, email: c.email })));
      await mongoose.disconnect();
      return;
    }
    console.log(`Found Customer: ${customer.name} (ID: ${customer._id})`);

    // 2. Find an Agent to assign
    const agent = await User.findOne({ role: 'agent' });
    if (!agent) {
      console.error('ERROR: Could not find any delivery agent. Please check seeds.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Found Agent: ${agent.name} (ID: ${agent._id})`);

    // 3. Find a Warehouse / Inventory location
    const warehouse = await Inventory.findOne({});
    if (!warehouse) {
      console.error('ERROR: Could not find any inventory/warehouse. Please check seeds.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Found Warehouse: ${warehouse.locationName || warehouse._id}`);

    // 4. Clean up any existing active/assigned/out_for_delivery orders for this customer to make sure screens are clear
    const deletedCount = await Order.deleteMany({
      customerId: customer._id,
      status: { $in: ['created', 'assigned', 'out_for_delivery'] }
    });
    console.log(`Cleared ${deletedCount.deletedCount} old active/assigned/out_for_delivery orders for customer.`);

    // 5. Create the new assigned Order directly bypassing controller restrictions
    const newOrder = new Order({
      customerId: customer._id,
      agentId: agent._id,
      warehouseId: warehouse._id,
      deliveryAddress: {
        line1: '12, MG Road, Landmark near Metro Station',
        line2: 'Trinity Layout',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        location: {
          lat: 12.9716,
          lng: 77.5946
        }
      },
      cylinderCount: 1,
      status: 'assigned',
      paymentMode: 'cod',
      paymentStatus: 'pending',
      totalAmount: 1050,
      subTotal: 1000,
      taxAmount: 50,
      deliveryCharge: 0,
      priority: 'urgent',
      deliveryOtp: '1234', // Pre-defined OTP for quick manual verification
      timeline: [
        { status: 'created', timestamp: new Date(), note: 'Order placed' },
        { status: 'assigned', timestamp: new Date(), note: `Assigned to agent ${agent.name}` }
      ]
    });

    await newOrder.save();
    console.log('\n======================================================');
    console.log('🎉 SUCCESS: MANUAL ORDER BOOKED & AGENT ASSIGNED!');
    console.log('======================================================');
    console.log(`Order ID (UUID):  ${newOrder.orderId}`);
    console.log(`Database _id:     ${newOrder._id}`);
    console.log(`Customer:         ${customer.name}`);
    console.log(`Assigned Agent:   ${agent.name}`);
    console.log(`OTP to Confirm:   1234`);
    console.log(`Status:           assigned`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from database.');
  } catch (err) {
    console.error('Error running manual booking script:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

// Make sure server file imports are loaded to bootstrap schemas and models
require('../src/app'); 

main();
