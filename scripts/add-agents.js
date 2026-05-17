'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = require('../src/config');
const logger = require('../src/config/logger');

const User = require('../src/modules/users/user.model');

async function addAgents() {
  try {
    logger.info('Connecting to database...');
    await mongoose.connect(config.db.uri);
    logger.info('Connected!');

    logger.info('Adding 1 Admin and 3 Agents safely (without deleting existing data)...');

    const adminPasswordHash = await bcrypt.hash(config.admin.password, 12);
    const agentPasswordHash = await bcrypt.hash('Agent@123456', 12);

    // Create or Update Admin
    await User.findOneAndUpdate(
      { email: config.admin.email },
      {
        name: config.admin.name,
        email: config.admin.email,
        passwordHash: adminPasswordHash,
        phone: config.admin.phone,
        role: 'admin',
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // Create or Update Agent 1
    await User.findOneAndUpdate(
      { email: 'rajesh.agent@cylinderplatform.com' },
      {
        name: 'Rajesh Kumar (Agent)',
        email: 'rajesh.agent@cylinderplatform.com',
        passwordHash: agentPasswordHash,
        phone: '+919876543210',
        role: 'agent',
        isActive: true,
        isOnDuty: true,
        location: { lat: 28.6139, lng: 77.2090 },
      },
      { upsert: true, new: true }
    );

    // Create or Update Agent 2
    await User.findOneAndUpdate(
      { email: 'priya.agent@cylinderplatform.com' },
      {
        name: 'Priya Singh (Agent)',
        email: 'priya.agent@cylinderplatform.com',
        passwordHash: agentPasswordHash,
        phone: '+919876543211',
        role: 'agent',
        isActive: true,
        isOnDuty: true,
        location: { lat: 28.5355, lng: 77.3910 },
      },
      { upsert: true, new: true }
    );

    // Create or Update Agent 3
    await User.findOneAndUpdate(
      { email: 'vikram.agent@cylinderplatform.com' },
      {
        name: 'Vikram Patel (Agent)',
        email: 'vikram.agent@cylinderplatform.com',
        passwordHash: agentPasswordHash,
        phone: '+919876543212',
        role: 'agent',
        isActive: true,
        isOnDuty: false,
        location: { lat: 28.6315, lng: 77.2167 },
      },
      { upsert: true, new: true }
    );

    logger.info('');
    logger.info('✅ Successfully added 1 Admin and 3 Agents to the database!');
    logger.info('Your new account (Anubhab Choudhury) was NOT deleted.');
    logger.info('');
    logger.info('=== LOGIN CREDENTIALS ===');
    logger.info(`Admin:    ${config.admin.email} / ${config.admin.password}`);
    logger.info(`Agent 1:  rajesh.agent@cylinderplatform.com / Agent@123456`);
    logger.info(`Agent 2:  priya.agent@cylinderplatform.com / Agent@123456`);
    logger.info(`Agent 3:  vikram.agent@cylinderplatform.com / Agent@123456`);
    logger.info('=========================');
    logger.info('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error('Script failed:', { error: err.message, stack: err.stack });
    await mongoose.disconnect();
    process.exit(1);
  }
}

addAgents();
