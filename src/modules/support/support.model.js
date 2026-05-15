'use strict';

const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Complaint:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         order:
 *           type: string
 *         category:
 *           type: string
 *           enum: [gas_leak, late_delivery, payment_issue, damaged_cylinder, app_issue, other]
 *         priority:
 *           type: string
 *           enum: [normal, urgent, emergency]
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *         resolution:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */

const complaintSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    ticketNumber: {
      type: String,
      unique: true,
    },
    category: {
      type: String,
      enum: ['gas_leak', 'late_delivery', 'payment_issue', 'damaged_cylinder', 'app_issue', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent', 'emergency'],
      default: 'normal',
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
    },
    resolution: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate ticket number before saving
complaintSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    this.ticketNumber = `TCK-${timestamp}-${random}`;
  }
  next();
});

// Indexes
complaintSchema.index({ user: 1 });
complaintSchema.index({ status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

module.exports = Complaint;
