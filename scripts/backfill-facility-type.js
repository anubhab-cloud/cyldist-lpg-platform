const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const User = require('../src/modules/users/user.model');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cylinder_platform')
  .then(async () => {
    // Backfill: set facilityType='household' for all customers missing it
    const result = await User.updateMany(
      { role: 'customer', facilityType: { $exists: false } },
      { $set: { facilityType: 'household' } }
    );
    console.log('Backfilled:', result.modifiedCount, 'customer records with household');

    // Set varied facility types for seed users (for testing)
    await User.findOneAndUpdate({ email: 'sunita@example.com' }, { $set: { facilityType: 'medical' } });
    await User.findOneAndUpdate({ email: 'vikram@example.com' }, { $set: { facilityType: 'commercial' } });
    console.log('Set Sunita => medical, Vikram => commercial');

    const customers = await User.find({ role: 'customer' })
      .select('name email facilityType kycStatus').lean();
    console.log('\nAll customers after update:');
    customers.forEach(c => console.log(` - ${c.name} (${c.email}): ${c.facilityType} | KYC: ${c.kycStatus}`));

    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
