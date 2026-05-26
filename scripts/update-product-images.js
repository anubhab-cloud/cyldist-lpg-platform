'use strict';

const mongoose = require('mongoose');
require('dotenv').config();

const config = require('../src/config');
const Product = require('../src/modules/products/product.model');

const images = {
  'Suraksha LPG Hose': '/images/products/hose.png',
  'Standard Regulator': '/images/products/regulator.png',
  'Gas Leak Detector': '/images/products/detector.png',
  'LPG Cylinder Trolley': '/images/products/trolley.png',
  'Lighter & Safety Kit': '/images/products/safety_kit.png',
};

async function updateProducts() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(config.db.uri);
    console.log('Connected!');

    for (const [name, path] of Object.entries(images)) {
      const res = await Product.updateOne({ name }, { $set: { imageUrl: path } });
      console.log(`Updated "${name}": matched ${res.matchedCount}, modified ${res.modifiedCount}`);
    }

    console.log('Product image updates complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err);
    process.exit(1);
  }
}

updateProducts();
