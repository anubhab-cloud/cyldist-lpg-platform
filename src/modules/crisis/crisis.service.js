'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              LPG CRISIS ALLOCATION ENGINE — crisis.service.js           ║
 * ║                                                                          ║
 * ║  Priority Score Formula:                                                 ║
 * ║  P = (W_sector × S_sector) + (W_urgency × S_urgency)                   ║
 * ║                            - (W_hoarding × S_hoarding)                  ║
 * ║                                                                          ║
 * ║  Weights: W_sector=1.5, W_urgency=1.0, W_hoarding=1.0                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Order       = require('../orders/order.model');
const User        = require('../users/user.model');
const AppSettings = require('../inventory/appsettings.model');
const Inventory   = require('../inventory/inventory.model');
const AppError    = require('../../shared/utils/AppError');
const logger      = require('../../config/logger');

// ─── Weight Constants ────────────────────────────────────────────────────────
const W_SECTOR   = 1.5;
const W_URGENCY  = 1.0;
const W_HOARDING = 1.0;

// ─── Sector Scores ───────────────────────────────────────────────────────────
const SECTOR_SCORES = {
  medical:      100,   // Hospital / Nursing Home  → P contribution: 150
  household:     50,   // Domestic Household       → P contribution: 75
  institutional: 30,   // Hostels / Offices        → P contribution: 45
  commercial:    10,   // Hotels / Restaurants     → P contribution: 15
};

class CrisisAllocationEngine {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PRIORITY SCORE COMPUTATION
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Compute the heuristic Priority Score P for a single booking.
   *
   * @param {string}  facilityType       - User's facility type
   * @param {number}  daysSinceLastRefill - Days since last successfully delivered order
   * @param {number}  avgCycleDays        - User's computed average consumption cycle
   * @param {number}  hoardingThreshold   - Days threshold below which hoarding penalty fires (from settings)
   * @returns {{ score: number, breakdown: object, hoardingPenaltyApplied: boolean }}
   */
  computePriorityScore(facilityType, daysSinceLastRefill, avgCycleDays, hoardingThreshold = 21) {
    // ── Sector Component ─────────────────────────────────────────────────────
    const S_sector  = SECTOR_SCORES[facilityType] ?? SECTOR_SCORES.household;
    const sectorContrib = W_SECTOR * S_sector;

    // ── Urgency Component ────────────────────────────────────────────────────
    // Measures how genuinely overdue this customer is.
    // Capped at 200 to prevent artificially huge scores for extremely old refills.
    const cycle = avgCycleDays > 0 ? avgCycleDays : 30;
    const S_urgency = Math.min(200, (daysSinceLastRefill / cycle) * 100);
    const urgencyContrib = W_URGENCY * S_urgency;

    // ── Anti-Hoarding Penalty ─────────────────────────────────────────────────
    // Hospitals are completely exempt.
    let S_hoarding = 0;
    const hoardingPenaltyApplied = facilityType !== 'medical' && daysSinceLastRefill < hoardingThreshold;
    if (hoardingPenaltyApplied) S_hoarding = 200;
    const hoardingContrib = W_HOARDING * S_hoarding;

    const score = sectorContrib + urgencyContrib - hoardingContrib;

    return {
      score: parseFloat(score.toFixed(2)),
      hoardingPenaltyApplied,
      breakdown: {
        sectorScore:     parseFloat(sectorContrib.toFixed(2)),
        urgencyScore:    parseFloat(urgencyContrib.toFixed(2)),
        hoardingPenalty: parseFloat(hoardingContrib.toFixed(2)),
        daysSinceRefill: daysSinceLastRefill,
        avgCycleDays:    cycle,
        facilityType,
        rawInputs: { S_sector, S_urgency, S_hoarding },
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. USER CONSUMPTION DATA
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Compute a user's last refill date and average consumption cycle
   * from their delivered order history.
   *
   * @param {string} userId
   * @returns {{ daysSinceLastRefill: number, avgCycleDays: number, lastDeliveredAt: Date|null }}
   */
  async getUserConsumptionData(userId) {
    const mongoose = require('mongoose');
    const uid = new mongoose.Types.ObjectId(userId);

    // Get all delivered orders sorted newest first
    const deliveredOrders = await Order.find({
      customerId: uid,
      status: 'delivered',
    })
      .select('deliveredAt createdAt cylinderCount')
      .sort({ deliveredAt: -1 })
      .limit(12) // last 12 deliveries is enough for cycle computation
      .lean();

    if (deliveredOrders.length === 0) {
      // No history — treat as never refilled (very high urgency)
      return { daysSinceLastRefill: 999, avgCycleDays: 30, lastDeliveredAt: null };
    }

    const lastDeliveredAt = new Date(deliveredOrders[0].deliveredAt || deliveredOrders[0].createdAt);
    const daysSinceLastRefill = Math.floor((Date.now() - lastDeliveredAt.getTime()) / 86400000);

    // Compute average cycle: gaps between consecutive deliveries
    let avgCycleDays = 30; // sensible default
    if (deliveredOrders.length >= 2) {
      const gaps = [];
      for (let i = 0; i < deliveredOrders.length - 1; i++) {
        const t1 = new Date(deliveredOrders[i].deliveredAt   || deliveredOrders[i].createdAt).getTime();
        const t2 = new Date(deliveredOrders[i+1].deliveredAt || deliveredOrders[i+1].createdAt).getTime();
        const gap = Math.abs(t1 - t2) / 86400000;
        if (gap > 0 && gap < 120) gaps.push(gap); // ignore outliers > 4 months
      }
      if (gaps.length > 0) {
        avgCycleDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
      }
    }

    return { daysSinceLastRefill, avgCycleDays, lastDeliveredAt };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. BATCH ALLOCATION ENGINE — The core "run" method
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Execute the batch allocation for all orders currently in `awaiting_allocation`.
   *
   * Algorithm:
   *   1. Fetch all awaiting_allocation orders with their users
   *   2. Compute P for each order
   *   3. Sort descending (Max-Heap behavior via Array.sort)
   *   4. Deduct 15% emergency reserve for hospitals
   *   5. Drain public pool top-down
   *   6. Mark each order as allocated or waitlisted_crisis_batch
   *   7. Update AppSettings.lastBatchSummary
   *   8. Emit socket event to admin clients
   *
   * @param {string}  adminId
   * @param {object}  io       - Socket.IO instance (optional)
   * @returns {object}         - Batch run summary
   */
  async runBatchAllocation(adminId, io = null) {
    logger.info('[CrisisEngine] Batch allocation started', { adminId });

    const settings = await AppSettings.getSingleton();
    const cm = settings.crisisMode;

    if (!cm.enabled) {
      throw new AppError('Crisis mode is not active. Cannot run batch allocation.', 400);
    }

    // ── Step 1: Find the warehouse with most available stock ─────────────────
    // (In a multi-warehouse setup, run per warehouse; here we pick primary)
    const warehouses = await Inventory.find({ availableCylinders: { $gt: 0 } })
      .sort({ availableCylinders: -1 })
      .lean();

    if (!warehouses.length) {
      throw new AppError('No warehouses with available stock. Batch cannot run.', 400);
    }

    const warehouse = warehouses[0];
    const totalAvailable = warehouse.availableCylinders;

    // ── Step 2: Reserve 15% for emergency (medical) use ──────────────────────
    const reservePct = (cm.emergencyReservePercent ?? 15) / 100;
    const emergencyReserve  = Math.ceil(totalAvailable * reservePct);
    let   publicPool        = totalAvailable - emergencyReserve;
    let   emergencyPool     = emergencyReserve;

    logger.info(`[CrisisEngine] Stock: total=${totalAvailable}, emergency=${emergencyReserve}, public=${publicPool}`);

    // ── Step 3: Fetch all orders waiting for this batch ───────────────────────
    const batchId = cm.currentBatchId || new Date().toISOString().split('T')[0];
    const pendingOrders = await Order.find({ crisisStatus: 'awaiting_allocation' })
      .populate('customerId', 'name email facilityType')
      .lean();

    if (!pendingOrders.length) {
      return {
        message: 'No orders in the allocation pool.',
        totalProcessed: 0, totalAllocated: 0, totalWaitlisted: 0,
        emergencyAllocated: 0, publicAllocated: 0,
        stockSnapshotBefore: totalAvailable,
      };
    }

    const hoardingThreshold = cm.hoardingThresholdDays ?? 21;

    // ── Step 4: Compute P for every order ────────────────────────────────────
    const scoredOrders = await Promise.all(
      pendingOrders.map(async (order) => {
        const user = order.customerId;
        const facilityType = user?.facilityType ?? 'household';

        const { daysSinceLastRefill, avgCycleDays } = await this.getUserConsumptionData(
          user?._id?.toString() ?? order.customerId?.toString()
        );

        const { score, breakdown, hoardingPenaltyApplied } = this.computePriorityScore(
          facilityType, daysSinceLastRefill, avgCycleDays, hoardingThreshold
        );

        return { ...order, _score: score, _breakdown: breakdown, _hoarding: hoardingPenaltyApplied };
      })
    );

    // ── Step 5: Sort ALL orders descending by score (no medical/other split) ──
    // ALL customers compete from the SAME public pool (85% of stock).
    // The 15% reserve is UNTOUCHED — it's for unexpected emergencies only.
    // If unused by end of batch, reserve rolls into next batch's total stock.
    const allOrdersSorted = scoredOrders.sort((a, b) => b._score - a._score);

    const leaderboard   = [];
    let totalAllocated  = 0;
    let totalWaitlisted = 0;
    let totalPartial    = 0;
    let publicUsed      = 0;
    let rank            = 1;

    // ── Step 6: Allocate from public pool (85%) — ALL sectors compete equally ──
    // Priority is determined ONLY by score (hospitals score higher due to sector weight).
    // Partial allocation: if customer needs 3 but only 1 left, give them 1.
    for (const order of allOrdersSorted) {
      const qtyRequested = order.cylinderCount ?? 1;
      let qtyAllocated = 0;
      let newCrisisStatus;
      let notes;

      if (publicPool >= qtyRequested) {
        // Full allocation
        qtyAllocated = qtyRequested;
        newCrisisStatus = 'allocated';
        notes = `Fully allocated from public pool. Score: ${order._score.toFixed(1)}. Rank #${rank}.`;
      } else if (publicPool > 0) {
        // Partial allocation — give whatever is left
        qtyAllocated = publicPool;
        newCrisisStatus = 'allocated';
        notes = `Partial allocation: ${qtyAllocated}/${qtyRequested} cylinders. Pool had only ${publicPool} left. Score: ${order._score.toFixed(1)}. Remainder waitlisted for next batch.`;
        totalPartial++;
      } else {
        // No stock left — waitlist
        qtyAllocated = 0;
        newCrisisStatus = 'waitlisted_crisis_batch';
        notes = `Public pool exhausted (0 left, need ${qtyRequested}). Score: ${order._score.toFixed(1)}. Rolled to next batch window.`;
      }

      const updateFields = {
        crisisStatus:               newCrisisStatus,
        crisisPriorityScore:        order._score,
        crisisScoreBreakdown:       order._breakdown,
        crisisHoardingPenaltyApplied: order._hoarding,
        crisisAllocationNotes:      notes,
        crisisBatchId:              batchId,
      };

      // If allocated (full or partial), mark for delivery processing
      if (qtyAllocated > 0) {
        updateFields.status = 'created'; // Release to normal order flow
        if (qtyAllocated < qtyRequested) {
          // Partial: store original count and cap the delivery
          updateFields.crisisCapApplied = true;
          updateFields.crisisOriginalCount = qtyRequested;
          updateFields.cylinderCount = qtyAllocated; // Reduce to what's available
        }
      }

      await Order.findByIdAndUpdate(order._id, updateFields);

      if (qtyAllocated > 0) {
        publicPool -= qtyAllocated;
        publicUsed += qtyAllocated;
        totalAllocated++;
      } else {
        totalWaitlisted++;
      }

      leaderboard.push({
        rank: rank++,
        orderId:      order.orderId,
        customerId:   order.customerId?._id,
        customerName: order.customerId?.name ?? 'Unknown',
        email:        order.customerId?.email,
        facilityType: order.customerId?.facilityType ?? 'household',
        cylindersRequested: qtyRequested,
        cylindersAllocated: qtyAllocated,
        score:        order._score,
        breakdown:    order._breakdown,
        hoarding:     order._hoarding,
        source:       'public_pool',
        status:       newCrisisStatus,
        partial:      qtyAllocated > 0 && qtyAllocated < qtyRequested,
        notes,
      });
    }

    // ── Step 7: Deduct allocated cylinders from inventory ────────────────────
    // Note: emergencyReserve remains UNTOUCHED in the warehouse.
    // If unused, it automatically becomes part of next batch's totalAvailable.
    if (publicUsed > 0) {
      await Inventory.findByIdAndUpdate(warehouse._id, {
        $inc: { availableCylinders: -publicUsed },
      });
    }

    // ── Step 8: Persist batch summary in AppSettings ─────────────────────────
    const summary = {
      totalProcessed:      allOrdersSorted.length,
      totalAllocated,
      totalWaitlisted,
      totalPartialAllocations: totalPartial,
      publicAllocated:     publicUsed,
      reserveUntouched:    emergencyReserve, // Reserve stays intact
      stockSnapshotBefore: totalAvailable,
      stockAfter:          totalAvailable - publicUsed,
      note:                `15% reserve (${emergencyReserve} cylinders) kept for unexpected emergencies. Will roll into next batch if unused.`,
    };

    await AppSettings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'crisisMode.lastBatchRunAt':     new Date(),
          'crisisMode.lastBatchRunBy':     adminId?.toString() || null,
          'crisisMode.currentBatchId':     batchId,
          'crisisMode.lastBatchSummary':   summary,
        },
      },
      { upsert: true }
    );

    // ── Step 9: Real-time push to admin socket room ───────────────────────────
    if (io) {
      io.to('admin-room').emit('crisis:batch_complete', {
        batchId, summary, leaderboard: leaderboard.slice(0, 50), // cap for socket payload
      });
    }

    logger.info('[CrisisEngine] Batch complete', summary);
    return { batchId, summary, leaderboard };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. GET POOL — Current batch pending orders with live preview scores
  // ──────────────────────────────────────────────────────────────────────────

  async getPoolWithPreviewScores() {
    const settings = await AppSettings.getSingleton();
    const hoardingThreshold = settings.crisisMode?.hoardingThresholdDays ?? 21;

    const pendingOrders = await Order.find({ crisisStatus: 'awaiting_allocation' })
      .populate('customerId', 'name email facilityType')
      .lean();

    const scored = await Promise.all(
      pendingOrders.map(async (order) => {
        const user = order.customerId;
        const facilityType = user?.facilityType ?? 'household';
        const { daysSinceLastRefill, avgCycleDays } = await this.getUserConsumptionData(
          user?._id?.toString() ?? order.customerId?.toString()
        );
        const { score, breakdown, hoardingPenaltyApplied } = this.computePriorityScore(
          facilityType, daysSinceLastRefill, avgCycleDays, hoardingThreshold
        );
        return { ...order, previewScore: score, previewBreakdown: breakdown, previewHoarding: hoardingPenaltyApplied };
      })
    );

    // Sort descending for preview leaderboard
    scored.sort((a, b) => b.previewScore - a.previewScore);

    return scored.map((o, idx) => ({
      rank:         idx + 1,
      orderId:      o.orderId,
      customerName: o.customerId?.name ?? 'Unknown',
      email:        o.customerId?.email,
      facilityType: o.customerId?.facilityType ?? 'household',
      cylinders:    o.cylinderCount,
      previewScore: o.previewScore,
      breakdown:    o.previewBreakdown,
      hoarding:     o.previewHoarding,
      crisisStatus: o.crisisStatus,
      createdAt:    o.createdAt,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. GET LEADERBOARD — Last batch results (already scored)
  // ──────────────────────────────────────────────────────────────────────────

  async getLastLeaderboard(batchId) {
    const query = { crisisPriorityScore: { $ne: null } };
    if (batchId) query.crisisBatchId = batchId;

    const orders = await Order.find(query)
      .populate('customerId', 'name email facilityType')
      .sort({ crisisPriorityScore: -1 })
      .lean();

    return orders.map((o, idx) => ({
      rank:              idx + 1,
      orderId:           o.orderId,
      customerName:      o.customerId?.name ?? 'Unknown',
      email:             o.customerId?.email,
      facilityType:      o.customerId?.facilityType ?? 'household',
      cylinders:         o.cylinderCount,
      score:             o.crisisPriorityScore,
      breakdown:         o.crisisScoreBreakdown,
      hoarding:          o.crisisHoardingPenaltyApplied,
      crisisStatus:      o.crisisStatus,
      allocationNotes:   o.crisisAllocationNotes,
      batchId:           o.crisisBatchId,
      capApplied:        o.crisisCapApplied,
      originalCount:     o.crisisOriginalCount,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. CUSTOMER'S OWN CRISIS POSITION
  // ──────────────────────────────────────────────────────────────────────────

  async getCustomerCrisisPosition(customerId) {
    const settings = await AppSettings.getSingleton();
    const hoardingThreshold = settings.crisisMode?.hoardingThresholdDays ?? 21;

    const pendingOrders = await Order.find({
      customerId,
      crisisStatus: 'awaiting_allocation',
    }).lean();

    if (!pendingOrders.length) return null;

    const order = pendingOrders[0];
    const user  = await User.findById(customerId).select('facilityType').lean();
    const facilityType = user?.facilityType ?? 'household';

    const { daysSinceLastRefill, avgCycleDays } = await this.getUserConsumptionData(customerId);
    const { score, breakdown, hoardingPenaltyApplied } = this.computePriorityScore(
      facilityType, daysSinceLastRefill, avgCycleDays, hoardingThreshold
    );

    // Approximate rank: count orders with higher score
    const higherCount = await Order.countDocuments({
      crisisStatus: 'awaiting_allocation',
      crisisPriorityScore: { $gt: score },
    });

    return {
      orderId: order.orderId,
      score,
      breakdown,
      hoardingPenaltyApplied,
      estimatedRank: higherCount + 1,
      batchWindowEnd: `${settings.crisisMode?.batchWindowEndHour ?? 16}:00`,
    };
  }
}

module.exports = new CrisisAllocationEngine();
