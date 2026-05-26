'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/modules/users/user.model');
const config = require('../src/config');

async function verifyUsers() {
  try {
    await mongoose.connect(config.db.uri);
    console.log('Connected to DB to verify users...');
    
    const user = await User.findOneAndUpdate(
      { email: 'amit@example.com' },
      { kycStatus: 'verified' },
      { new: true }
    );
    
    if (user) {
      console.log('Amit Sharma is now KYC VERIFIED!');
    } else {
      console.log('Customer amit@example.com not found.');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error verifying users:', err);
    process.exit(1);
  }
}

verifyUsers();
