const mongoose = require('mongoose');
const dotenv = require('dotenv');

const bcrypt = require('bcryptjs');

dotenv.config();

const dbUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/cylinder_platform';

// Standard Bengaluru test locations within the GIS Simulator focus bounds
const BENGALURU_LOCATIONS = [
  {
    name: 'Amit Sharma',
    email: 'amit@example.com',
    line1: '12, MG Road, Landmark near Metro Station',
    city: 'Bengaluru',
    lat: 12.9716,
    lng: 77.5946,
    cylinderCount: 1,
    priority: 'normal',
    sequence: 1
  },
  {
    name: 'Priya Patel',
    email: 'priya@example.com',
    line1: '45, 100 Feet Road, Indiranagar',
    city: 'Bengaluru',
    lat: 12.9684,
    lng: 77.6321,
    cylinderCount: 2,
    priority: 'urgent',
    sequence: 2
  },
  {
    name: 'Rohan Das',
    email: 'rohan@example.com',
    line1: '78, 80 Feet Road, Koramangala',
    city: 'Bengaluru',
    lat: 12.9448,
    lng: 77.6205,
    cylinderCount: 1,
    priority: 'medium',
    sequence: 3
  },
  {
    name: 'Sneha Rao',
    email: 'sneha@example.com',
    line1: '120, 4th Block, Jayanagar',
    city: 'Bengaluru',
    lat: 12.9384,
    lng: 77.5816,
    cylinderCount: 3,
    priority: 'normal',
    sequence: 4
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@example.com',
    line1: '10, Kasturba Road, near Cubbon Park',
    city: 'Bengaluru',
    lat: 12.9779,
    lng: 77.5952,
    cylinderCount: 2,
    priority: 'urgent',
    sequence: 5
  },
  {
    name: 'Deepa Murthy',
    email: 'deepa@example.com',
    line1: '32, Commercial Street, Tasker Town',
    city: 'Bengaluru',
    lat: 12.9818,
    lng: 77.6083,
    cylinderCount: 1,
    priority: 'medium',
    sequence: 6
  },
  {
    name: 'Arjun Nair',
    email: 'arjun@example.com',
    line1: '56, Ulsoor Lake Road',
    city: 'Bengaluru',
    lat: 12.9815,
    lng: 77.6214,
    cylinderCount: 2,
    priority: 'normal',
    sequence: 7
  }
];

async function main() {
  try {
    console.log('Connecting to database:', dbUrl);
    await mongoose.connect(dbUrl);
    console.log('Successfully connected to MongoDB');

    // Load models
    const User = mongoose.model('User');
    const Inventory = mongoose.model('Inventory');
    const Order = mongoose.model('Order');

    // Find a warehouse
    const warehouse = await Inventory.findOne({});
    if (!warehouse) {
      console.error('ERROR: No warehouse found in database. Please run npm run seed first.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Using Warehouse: ${warehouse.locationName || warehouse._id}`);

    // Find an agent
    const agent = await User.findOne({ role: 'agent' });
    if (!agent) {
      console.error('ERROR: No agent found in database.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Using Agent: ${agent.name} (ID: ${agent._id})`);

    // Clean up old active test orders to avoid clutter
    const cleared = await Order.deleteMany({
      priority: { $in: ['urgent', 'medium', 'normal'] },
      status: { $in: ['created', 'assigned', 'out_for_delivery'] }
    });
    console.log(`Cleared ${cleared.deletedCount} old test orders.`);

    console.log('\nStarting seeding for 7 unique customers at different Bengaluru coordinates...\n');

    for (const loc of BENGALURU_LOCATIONS) {
      // Find or create customer
      let customer = await User.findOne({ email: loc.email });
      if (!customer) {
        const hash = await bcrypt.hash('Customer@123', 10);
        customer = new User({
          name: loc.name,
          email: loc.email,
          passwordHash: hash,
          phone: `+9198765${Math.floor(10000 + Math.random() * 90000)}`,
          role: 'customer',
          status: 'active',
          address: {
            line1: loc.line1,
            city: loc.city,
            state: 'Karnataka',
            pincode: '560001'
          }
        });
        await customer.save();
        console.log(`Created Customer: ${customer.name} (${customer.email})`);
      } else {
        console.log(`Existing Customer: ${customer.name} (${customer.email})`);
      }

      // Create new Order under created status at the precise coordinate
      const order = new Order({
        customerId: customer._id,
        agentId: null,
        warehouseId: warehouse._id,
        deliveryAddress: {
          line1: loc.line1,
          line2: 'Trinity Area',
          city: loc.city,
          state: 'Karnataka',
          pincode: '560001',
          location: {
            lat: loc.lat,
            lng: loc.lng
          }
        },
        cylinderCount: loc.cylinderCount,
        status: 'created',
        paymentMode: 'cod',
        paymentStatus: 'pending',
        totalAmount: loc.cylinderCount * 1050,
        subTotal: loc.cylinderCount * 1000,
        taxAmount: loc.cylinderCount * 50,
        priority: loc.priority,
        deliverySequence: loc.sequence,
        deliveryOtp: String(1000 + loc.sequence),
        timeline: [
          { status: 'created', timestamp: new Date(), note: 'Placed' }
        ]
      });

      await order.save();
      console.log(`  └─ Created Order ${order.orderId} (Seq: #${loc.sequence}, Priority: ${loc.priority.toUpperCase()})`);
    }

    console.log('\n======================================================');
    console.log('🎉 SUCCESS: 7 UNIQUE MULTI-LOCATION ORDERS PLACED!');
    console.log('======================================================');
    console.log('Use agent Rajesh Kumar to view active deliveries.');
    console.log('Verify the sequence stop pins on the GIS Simulator!');
    console.log('======================================================\n');

    await mongoose.disconnect();
    console.log('Disconnected from database.');
  } catch (err) {
    console.error('Error seeding locations:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

// Bootstrap mongoose models
require('../src/app');

main();
