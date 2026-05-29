'use strict';

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH ORDER SCHEMA
// Represents a geocoded, dispatchable delivery order with spatial indexing.
// ═══════════════════════════════════════════════════════════════════════════════

const dispatchOrderSchema = new mongoose.Schema(
  {
    // Reference to the parent Order document
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },

    // Customer details (denormalized for fast reads)
    customerName: { type: String, required: true },
    customerPhone: { type: String },

    // Human-readable address text (input to geocoding)
    addressText: { type: String, required: true },

    // GeoJSON Point — the geocoded delivery location
    // Indexed with 2dsphere for spatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (v) => v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90,
          message: 'Coordinates must be [lng, lat] within valid ranges.',
        },
      },
    },

    // Priority tier — affects routing weight
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'LOW',
    },

    // Dispatch lifecycle status
    status: {
      type: String,
      enum: ['pending', 'clustered', 'assigned', 'in_transit', 'delivered', 'failed'],
      default: 'pending',
      index: true,
    },

    // Assigned cluster ID from K-Means (zero-indexed)
    clusterId: {
      type: Number,
      default: null,
    },

    // Assigned delivery agent
    assignedAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent',
      default: null,
    },

    // Computed delivery sequence within the agent's route (1-based)
    deliverySequence: {
      type: Number,
      default: null,
    },

    // Estimated travel time from previous stop (seconds)
    etaFromPrevious: {
      type: Number,
      default: null,
    },

    // Distance from previous stop (meters)
    distanceFromPrevious: {
      type: Number,
      default: null,
    },

    // Window metadata
    dispatchBatchId: {
      type: String, // e.g. "2026-05-28T17:00"
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// 2dsphere spatial index for geo-queries
dispatchOrderSchema.index({ location: '2dsphere' });
// Compound index for batch dispatch queries
dispatchOrderSchema.index({ status: 1, dispatchBatchId: 1, priority: -1 });

const DispatchOrder = mongoose.model('DispatchOrder', dispatchOrderSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY AGENT SCHEMA
// Tracks agent position, capacity, and availability for dispatch assignment.
// ═══════════════════════════════════════════════════════════════════════════════

const deliveryAgentSchema = new mongoose.Schema(
  {
    // Reference to the User document (role: 'agent')
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    name: { type: String, required: true },
    phone: { type: String },

    // Live GeoJSON position — updated via Socket.IO
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [77.5946, 12.9716], // Default: Bengaluru center
      },
    },

    // Availability state machine
    status: {
      type: String,
      enum: ['available', 'busy', 'offline', 'returning'],
      default: 'available',
      index: true,
    },

    // Vehicle constraints
    vehicleType: {
      type: String,
      enum: ['bike', 'auto', 'mini_truck', 'truck'],
      default: 'bike',
    },
    maxCapacity: {
      type: Number,
      default: 4, // Max cylinders per trip
      min: 1,
      max: 50,
    },
    currentLoad: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Performance metrics (rolling averages)
    avgDeliveryTimeMinutes: { type: Number, default: 25 },
    totalDeliveries: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },

    // Last known update timestamp (for staleness detection)
    lastLocationUpdate: { type: Date, default: Date.now },

    // Active route assignment
    activeRouteId: { type: String, default: null },
    assignedOrderCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// 2dsphere index on agent location for proximity queries
deliveryAgentSchema.index({ currentLocation: '2dsphere' });
// Compound index for finding available agents
deliveryAgentSchema.index({ status: 1, maxCapacity: 1 });

deliveryAgentSchema.methods.hasCapacity = function (cylinderCount) {
  return this.currentLoad + cylinderCount <= this.maxCapacity;
};

deliveryAgentSchema.methods.getRemainingCapacity = function () {
  return this.maxCapacity - this.currentLoad;
};

const DeliveryAgent = mongoose.model('DeliveryAgent', deliveryAgentSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCH ROUTE SCHEMA
// Stores the computed optimized route for an agent per dispatch batch.
// ═══════════════════════════════════════════════════════════════════════════════

const dispatchRouteSchema = new mongoose.Schema(
  {
    routeId: {
      type: String,
      required: true,
      unique: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DeliveryAgent',
      required: true,
    },
    dispatchBatchId: { type: String, required: true },

    // Ordered stop sequence
    stops: [
      {
        dispatchOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'DispatchOrder' },
        orderId: String,
        sequence: Number,
        location: {
          type: { type: String, default: 'Point' },
          coordinates: [Number],
        },
        customerName: String,
        priority: String,
        estimatedArrival: Date,
        distanceMeters: Number,
        durationSeconds: Number,
      },
    ],

    // Full route polyline (GeoJSON LineString from Ola Maps Directions API)
    routeGeometry: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString',
      },
      coordinates: [[Number]], // array of [lng, lat] pairs
    },

    // Aggregate metrics
    totalDistanceMeters: { type: Number, default: 0 },
    totalDurationSeconds: { type: Number, default: 0 },
    totalStops: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['computed', 'dispatched', 'in_progress', 'completed'],
      default: 'computed',
    },
  },
  { timestamps: true }
);

dispatchRouteSchema.index({ agentId: 1, dispatchBatchId: 1 });

const DispatchRoute = mongoose.model('DispatchRoute', dispatchRouteSchema);

module.exports = { DispatchOrder, DeliveryAgent, DispatchRoute };
