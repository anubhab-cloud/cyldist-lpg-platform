'use strict';

const mongoose = require('mongoose');

const whatsappSessionSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  currentStep: {
    type: String,
    enum: [
      'idle',
      'menu',
      'booking_name',
      'booking_address',
      'booking_type',
      'booking_qty',
      'refill_customerId',
      'refill_qty',
      'newconn_name',
      'newconn_aadhaar',
      'newconn_address',
      'newconn_mobile',
      'track_orderId'
    ],
    default: 'idle',
  },
  tempData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastInteraction: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// Auto-reset sessions after 1 hour of inactivity
whatsappSessionSchema.index({ lastInteraction: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('WhatsAppSession', whatsappSessionSchema);
