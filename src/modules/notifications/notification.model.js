'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['order', 'delivery', 'payment', 'stock', 'emergency', 'system'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    icon: {
      type: String,
      default: '🔔',
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    actions: {
      type: [String],
      default: [],
    },
    relatedId: {
      type: String, // Can be orderId, warehouseId, etc.
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for fast fetching and unread counting
notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
