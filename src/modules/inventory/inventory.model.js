'use strict';

const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         warehouseId:
 *           type: string
 *         warehouseName:
 *           type: string
 *         location:
 *           $ref: '#/components/schemas/GeoPoint'
 *         totalCylinders:
 *           type: integer
 *         availableCylinders:
 *           type: integer
 *         reservedCylinders:
 *           type: integer
 *         lowStockThreshold:
 *           type: integer
 *         isActive:
 *           type: boolean
 */

const inventorySchema = new mongoose.Schema(
  {
    warehouseId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    warehouseName: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    totalCylinders: {
      type: Number,
      required: true,
      min: [0, 'Total cylinders cannot be negative'],
    },
    availableCylinders: {
      type: Number,
      required: true,
      min: [0, 'Available cylinders cannot be negative'],
    },
    reservedCylinders: {
      type: Number,
      default: 0,
      min: [0, 'Reserved cylinders cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Threshold cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Metadata for audit trail
    lastRestockedAt: {
      type: Date,
    },
    lastRestockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
inventorySchema.index({ availableCylinders: 1 }); // For low-stock queries
inventorySchema.index({ 'location.lat': 1, 'location.lng': 1 }); // For geo nearest

// --- Virtuals ---
inventorySchema.virtual('isLowStock').get(function () {
  return this.availableCylinders <= this.lowStockThreshold;
});

inventorySchema.virtual('utilizationRate').get(function () {
  if (!this.totalCylinders) return 0;
  return parseFloat(
    (((this.totalCylinders - this.availableCylinders) / this.totalCylinders) * 100).toFixed(2)
  );
});

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;
