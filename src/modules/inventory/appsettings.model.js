'use strict';

const mongoose = require('mongoose');

/**
 * AppSettings — singleton document for platform-wide admin-controlled settings.
 * Uses a fixed key ('global') so there's always exactly one document.
 */
const appSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },

    // ─── Crisis Mode ─────────────────────────────────────────────────────────
    crisisMode: {
      enabled: { type: Boolean, default: false },
      severity: {
        type: String,
        enum: ['moderate', 'severe', 'critical'],
        default: 'moderate',
      },
      message: {
        type: String,
        default: 'Priority allocation is currently in effect due to high demand and low depot stocks.',
        maxlength: 300,
      },
      enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      enabledAt: { type: Date },

      // ── Batch Window Configuration ──────────────────────────────────────────
      // The daily time window during which orders are held in the pool
      batchWindowStartHour: { type: Number, default: 6  }, // 6:00 AM
      batchWindowEndHour:   { type: Number, default: 16 }, // 4:00 PM

      // ID of the current active batch (YYYY-MM-DD format)
      currentBatchId: { type: String, default: null },

      // Timestamp of the last batch engine run
      lastBatchRunAt: { type: Date, default: null },
      lastBatchRunBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

      // Summary of last batch
      lastBatchSummary: {
        totalProcessed:      { type: Number, default: 0 },
        totalAllocated:      { type: Number, default: 0 },
        totalWaitlisted:     { type: Number, default: 0 },
        emergencyAllocated:  { type: Number, default: 0 },
        publicAllocated:     { type: Number, default: 0 },
        stockSnapshotBefore: { type: Number, default: 0 },
      },

      // ── Per-sector Operational Parameters ───────────────────────────────────
      emergencyReservePercent:     { type: Number, default: 15  }, // % reserved for hospitals
      hotelCapReductionPercent:    { type: Number, default: 70  }, // hotel qty cut by 70%
      householdCrisisCooldownDays: { type: Number, default: 30  }, // 30-day household gap
      hotelCrisisCooldownDays:     { type: Number, default: 7   }, // 7-day hotel gap
      hoardingThresholdDays:       { type: Number, default: 21  }, // days below which hoarding penalty fires
    },

  },
  { timestamps: true }
);

const AppSettings = mongoose.model('AppSettings', appSettingsSchema);

/**
 * Get (or create) the singleton settings document.
 * @returns {Promise<Document>}
 */
AppSettings.getSingleton = async function () {
  let doc = await AppSettings.findOne({ key: 'global' }).lean();
  if (!doc) {
    doc = await AppSettings.create({ key: 'global' });
    doc = doc.toObject();
  }
  return doc;
};

module.exports = AppSettings;
