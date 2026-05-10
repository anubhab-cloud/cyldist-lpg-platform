'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         orderId:
 *           type: string
 *           description: Unique UUID order identifier
 *         customerId:
 *           type: string
 *         agentId:
 *           type: string
 *         warehouseId:
 *           type: string
 *         deliveryAddress:
 *           $ref: '#/components/schemas/Address'
 *         cylinderCount:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [created, assigned, out_for_delivery, delivered, cancelled]
 *         chatRoomId:
 *           type: string
 *         timeline:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               note:
 *                 type: string
 *         totalAmount:
 *           type: number
 *         notes:
 *           type: string
 */

// Valid order status transitions
const STATUS_TRANSITIONS = {
  created: ['assigned', 'cancelled'],
  assigned: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

const timelineEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['created', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    label: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    cylinderCount: {
      type: Number,
      required: true,
      min: [1, 'Must order at least 1 cylinder'],
      max: [10, 'Cannot order more than 10 cylinders at once'],
    },
    status: {
      type: String,
      enum: ['created', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'created',
    },
    // Chat room ID — same as orderId for simplicity
    chatRoomId: {
      type: String,
      default: function () {
        return this.orderId;
      },
    },
    timeline: [timelineEntrySchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    pricePerCylinder: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 500,
    },
    // Estimated delivery time (set when assigned)
    estimatedDeliveryTime: {
      type: Date,
    },
    // Actual delivery confirmation time
    deliveredAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// --- Indexes ---
orderSchema.index({ customerId: 1, status: 1 });
orderSchema.index({ agentId: 1, status: 1 });
orderSchema.index({ warehouseId: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ chatRoomId: 1 });

// --- Static: validate status transition ---
orderSchema.statics.isValidTransition = function (currentStatus, newStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

orderSchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;

// --- Pre-save: ensure timeline is initialized ---
orderSchema.pre('save', function (next) {
  if (this.isNew && this.timeline.length === 0) {
    this.timeline.push({ status: 'created', timestamp: new Date() });
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
