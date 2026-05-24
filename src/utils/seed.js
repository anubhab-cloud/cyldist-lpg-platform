'use strict';

const Product = require('../modules/products/product.model');
const Coupon = require('../modules/coupons/coupon.model');
const logger = require('../config/logger');

async function seedData() {
  try {
    // Seed Products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      await Product.insertMany([
        { name: 'Suraksha LPG Hose', description: 'Flexible, steel-wire reinforced rubber hose for maximum safety.', price: 250 },
        { name: 'Standard Regulator', description: 'ISI marked click-on LPG regulator.', price: 350 },
        { name: 'Gas Leak Detector', description: 'Smart alarm system for early gas leak detection.', price: 1200 },
        { name: 'LPG Cylinder Trolley', description: 'Heavy-duty stainless steel trolley with wheels.', price: 450 },
        { name: 'Lighter & Safety Kit', description: 'Gas lighter and basic fire safety blanket.', price: 150 },
      ]);
      logger.info('✅ Seeded default accessories/products.');
    }

    // Seed Coupons
    const couponCount = await Coupon.countDocuments();
    if (couponCount === 0) {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1); // Valid for 1 year
      await Coupon.create({
        code: 'SAVE50',
        description: 'Flat ₹50 off on online payments',
        discountPercentage: 0,
        maxDiscountAmount: 50,
        isActive: true,
        expiryDate: expiry
      });
      logger.info('✅ Seeded default coupons.');
    }
  } catch (err) {
    logger.error('Error seeding data:', err);
  }
}

module.exports = { seedData };
