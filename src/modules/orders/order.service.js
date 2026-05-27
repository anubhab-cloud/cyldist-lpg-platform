'use strict';

const orderRepository = require('./order.repository');
const logger = require('../../config/logger');
const inventoryService = require('../inventory/inventory.service');
const userRepository = require('../users/user.repository');
const notificationService = require('../notifications/notification.service');
const cache = require('../../shared/cache/redis.cache');
const AppError = require('../../shared/utils/AppError');
const Order = require('./order.model');
const emailService = require('../../utils/email');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../../config');

let razorpayInstance = null;
if (config.razorpay.keyId && config.razorpay.keySecret) {
  razorpayInstance = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

const ACTIVE_ORDER_CACHE_TTL = 60; // seconds

/**
 * Order management service.
 * Handles the full order lifecycle: create → assign → out_for_delivery → delivered/cancelled
 */
class OrderService {
  /**
   * Create a new cylinder booking.
   * Atomically deducts inventory.
   *
   * @param {object} data
   * @param {string} customerId
   */
  async createOrder(data, customerId) {
    const { warehouseId, deliveryAddress, cylinderCount, notes, pricePerCylinder = 850, paymentMode = 'cod', cylinderType = 'Domestic (14.2 kg)', priority = 'normal' } = data;

    // Check KYC Status
    const user = await userRepository.findById(customerId);
    if (!user) throw new AppError('User not found.', 404);
    if (user.kycStatus !== 'verified') {
      throw new AppError('KYC not verified. Please complete your KYC verification to book a cylinder.', 403);
    }

    // ─── FACILITY-TYPE-AWARE BOOKING LIMIT ───────────────────────────────────
    // Household: max 1 cylinder per 25 days (government regulation)
    // Commercial (Hotel/Restaurant), Medical (Hospital/Nursing Home),
    // Institutional (Other): unlimited — they have high operational needs
    const UNLIMITED_FACILITY_TYPES = ['commercial', 'medical', 'institutional'];
    const isUnlimited = UNLIMITED_FACILITY_TYPES.includes(user.facilityType);

    if (!isUnlimited) {
      const maxCylinders = parseInt(
        process.env.MAX_CYLINDERS_PER_PERIOD !== undefined
          ? process.env.MAX_CYLINDERS_PER_PERIOD
          : config.booking.maxCylinders,
        10
      );
      const periodDays = parseInt(
        process.env.BOOKING_PERIOD_DAYS !== undefined
          ? process.env.BOOKING_PERIOD_DAYS
          : config.booking.periodDays,
        10
      );

      if (periodDays > 0) {
        // Single-order quantity check
        if (cylinderCount > maxCylinders) {
          throw new AppError(
            `Cylinder booking limit exceeded. Household customers can only book a maximum of ${maxCylinders} cylinder${maxCylinders > 1 ? 's' : ''} per ${periodDays} days.`,
            400
          );
        }

        const mongoose = require('mongoose');
        const limitStartDate = new Date();
        limitStartDate.setDate(limitStartDate.getDate() - periodDays);

        const recentCylindersCount = await Order.aggregate([
          {
            $match: {
              customerId: new mongoose.Types.ObjectId(customerId),
              status: { $ne: 'cancelled' },
              createdAt: { $gte: limitStartDate },
            },
          },
          { $group: { _id: null, total: { $sum: '$cylinderCount' } } },
        ]);

        const currentCount = recentCylindersCount.length > 0 ? recentCylindersCount[0].total : 0;
        if (currentCount + cylinderCount > maxCylinders) {
          // Find the oldest qualifying order to compute days remaining
          const lastOrder = await Order.findOne({
            customerId,
            status: { $ne: 'cancelled' },
            createdAt: { $gte: limitStartDate },
          })
            .sort({ createdAt: -1 })
            .lean();

          let daysRemaining = periodDays;
          if (lastOrder) {
            const diffTime = Math.abs(new Date() - new Date(lastOrder.createdAt));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(1, periodDays - diffDays);
          }

          throw new AppError(
            `Booking limit exceeded. Household customers can only book 1 cylinder per ${periodDays} days. ` +
              `You can book your next cylinder in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
            400
          );
        }
      }
    }
    // Commercial / Medical / Institutional: no per-period limit applied ──────

    // ─── CRISIS MODE INTERCEPT ────────────────────────────────────────────────
    // When admin has enabled Crisis Mode, orders are NOT processed normally.
    // Instead they enter a holding pool (awaiting_allocation) and wait for the
    // batch engine to allocate based on the Priority Score formula.
    const AppSettings = require('../inventory/appsettings.model');
    const settings    = await AppSettings.getSingleton();

    if (settings.crisisMode?.enabled) {
      const cm           = settings.crisisMode;
      const facilityType = user.facilityType ?? 'household';

      // ── Apply sector-specific crisis constraints ─────────────────────────
      let effectiveCylinderCount = cylinderCount;
      let crisisCapApplied       = false;
      let crisisOriginalCount    = null;
      let crisisNotes            = '';

      // 1. Hotels / Commercial: 70% reduction cap + 7-day cooldown
      if (facilityType === 'commercial') {
        const cooldownDays = cm.hotelCrisisCooldownDays ?? 7;
        const cooldownStart = new Date();
        cooldownStart.setDate(cooldownStart.getDate() - cooldownDays);
        const recentHotelOrder = await Order.findOne({
          customerId,
          status: { $ne: 'cancelled' },
          createdAt: { $gte: cooldownStart },
        }).sort({ createdAt: -1 }).lean();

        if (recentHotelOrder) {
          const diffTime = Math.abs(new Date() - new Date(recentHotelOrder.createdAt));
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(1, cooldownDays - diffDays);

          throw new AppError(
            `During crisis mode, commercial accounts have a mandatory ${cooldownDays}-day lock period. ` +
            `You can place your next booking in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
            400
          );
        }
        // Apply 70% capacity reduction
        const capPct = (cm.hotelCapReductionPercent ?? 70) / 100;
        const maxAllowed = Math.max(1, Math.floor(cylinderCount * (1 - capPct)));
        if (cylinderCount > maxAllowed) {
          crisisOriginalCount    = cylinderCount;
          effectiveCylinderCount = maxAllowed;
          crisisCapApplied       = true;
          crisisNotes = `Crisis cap applied: order reduced from ${crisisOriginalCount} → ${effectiveCylinderCount} cylinders (${cm.hotelCapReductionPercent}% reduction).`;
        }
      }

      // 2. Households: strict 30-day lock period check during crisis mode
      if (facilityType === 'household') {
        const cooldownDays  = cm.householdCrisisCooldownDays ?? 30;
        const cooldownStart = new Date();
        cooldownStart.setDate(cooldownStart.getDate() - cooldownDays);
        const recentOrder = await Order.findOne({
          customerId,
          status: { $ne: 'cancelled' },
          createdAt: { $gte: cooldownStart },
        }).sort({ createdAt: -1 }).lean();
        
        if (recentOrder) {
          const diffTime = Math.abs(new Date() - new Date(recentOrder.createdAt));
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(1, cooldownDays - diffDays);
          
          throw new AppError(
            `During crisis mode, household connections have a strict ${cooldownDays}-day lock period. ` +
            `You can place your next booking in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`,
            400
          );
        }
      }

      // 3. Medical / Hospital: No limits. No penalty. Accept immediately.
      if (facilityType === 'medical') {
        crisisNotes = 'Medical facility order. Emergency reserve access at batch run.';
      }

      // ── Billing (same as normal) ─────────────────────────────────────────
      const subTotal       = pricePerCylinder * effectiveCylinderCount;
      const taxAmount      = Math.round(subTotal * 0.05);
      let   deliveryCharge = 0;
      if (priority === 'medium') deliveryCharge = 50;
      if (priority === 'urgent') deliveryCharge = 100;
      const discountAmount = paymentMode === 'online' ? Math.round(subTotal * 0.05) : 0;
      const totalAmount    = subTotal + taxAmount + deliveryCharge - discountAmount;

      // ── Generate batch ID (today's date) ────────────────────────────────
      const batchId = new Date().toISOString().split('T')[0];

      // ── Create order in holding pool — NO inventory deduction ────────────
      const orderData = {
        customerId,
        warehouseId,
        deliveryAddress,
        cylinderCount:      effectiveCylinderCount,
        cylinderType,
        notes:              crisisNotes || notes,
        priority,
        pricePerCylinder,
        subTotal,
        taxAmount,
        deliveryCharge,
        discountAmount,
        totalAmount,
        paymentMode,
        paymentStatus: 'pending',
        // Crisis batch fields
        status:              'awaiting_allocation',
        crisisStatus:        'awaiting_allocation',
        crisisBatchId:       batchId,
        crisisCapApplied,
        crisisOriginalCount,
        crisisAllocationNotes: crisisNotes,
      };

      const order    = await orderRepository.create(orderData);
      const customer = await userRepository.findById(customerId);
      notificationService.emit('order.created', { order, customer });
      await cache.set(`order:${order.orderId}`, order, ACTIVE_ORDER_CACHE_TTL);

      logger.info(`[CrisisMode] Order ${order.orderId} entered batch pool.`, {
        facilityType, effectiveCylinderCount, crisisCapApplied, batchId,
      });

      return order;
    }
    // ─── END CRISIS MODE INTERCEPT ────────────────────────────────────────

    // Billing calculations

    const subTotal = pricePerCylinder * cylinderCount;
    const taxAmount = Math.round(subTotal * 0.05); // 5% GST
    
    // Dynamic Delivery Charge based on Priority
    let deliveryCharge = 0; // normal
    if (priority === 'medium') deliveryCharge = 50;
    if (priority === 'urgent') deliveryCharge = 100;
    
    const discountAmount = paymentMode === 'online' ? Math.round(subTotal * 0.05) : 0; // 5% off for online payments
    const totalAmount = subTotal + taxAmount + deliveryCharge - discountAmount;

    // Verify warehouse exists and has stock
    await inventoryService.deductStock(warehouseId, cylinderCount);

    // Online payments are considered pending until verified
    const paymentStatus = paymentMode === 'cod' ? 'pending' : 'pending';

    let razorpayOrderId = null;

    if (paymentMode === 'online' && razorpayInstance) {
      try {
        const rpOrder = await razorpayInstance.orders.create({
          amount: totalAmount * 100, // amount in paise (using calculated total)
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
        });
        razorpayOrderId = rpOrder.id;
      } catch (err) {
        const errorMsg = err.error?.description || err.message || JSON.stringify(err);
        throw new AppError('Failed to create online payment order. ' + errorMsg, 500);
      }
    }

    // Dynamic calculations for Crisis Mode / Emergency bookings
    let isEmergency = false;
    let emergencyCategory = null;
    let emergencyDependents = 0;
    let emergencyPurpose = '';
    let gasRemainingPercent = null;
    let lastRefillDate = null;
    let averageMonthlyUsage = null;
    let priorityScore = 0;
    let hoardingPenaltyApplied = false;
    let isFlaggedForManualReview = false;

    if (data.isEmergency) {
      isEmergency = true;
      emergencyCategory = data.emergencyCategory || 'Other';
      emergencyDependents = Number(data.emergencyDependents) || 0;
      emergencyPurpose = data.emergencyPurpose || '';
      gasRemainingPercent = Number(data.gasRemainingPercent) || 0;
      averageMonthlyUsage = data.averageMonthlyUsage || '1 cyl';

      // 1. Anti-Hoarding Check: Check orders count/volume in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ordersIn30Days = await Order.find({
        customerId,
        createdAt: { $gte: thirtyDaysAgo },
        status: { $ne: 'cancelled' },
      }).lean();
      
      const totalCylinders30Days = ordersIn30Days.reduce((sum, o) => sum + (o.cylinderCount || 0), 0);

      // Check last refill recency within 7 days
      let daysSinceLastRefill = 30; // Default fallback to safe distance
      if (data.lastRefillDate) {
        lastRefillDate = new Date(data.lastRefillDate);
        const diffTime = Math.abs(new Date() - lastRefillDate);
        daysSinceLastRefill = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      if (totalCylinders30Days > 2 || daysSinceLastRefill < 7) {
        hoardingPenaltyApplied = true;
        isFlaggedForManualReview = true;
      }

      // 2. Score breakdown calculations
      // Category Weight: Hospital/Ambulance = 60, Old Age/Relief = 45, Hostel/Household = 30, Restaurant/Hotel = 15
      let categoryWeight = 0;
      if (['Hospital', 'Ambulance'].includes(emergencyCategory)) categoryWeight = 60;
      else if (['Relief Center', 'Old Age Home'].includes(emergencyCategory)) categoryWeight = 45;
      else if (['Hostel', 'Household'].includes(emergencyCategory)) categoryWeight = 30;
      else if (['Restaurant', 'Hotel'].includes(emergencyCategory)) categoryWeight = 15;

      // Dependents Weight: dependents * 2, capped at 20
      const dependentsWeight = Math.min(20, emergencyDependents * 2);

      // Gas Remaining Weight: (100 - gasRemaining) * 0.4
      const gasWeight = Math.round((100 - gasRemainingPercent) * 0.4);

      // Days Since Refill Weight: Math.min(30, daysSinceLastRefill)
      const refillDaysWeight = Math.min(30, daysSinceLastRefill);

      // Hoarding Penalty Weight: -25 if hoarding detected
      const penaltyWeight = hoardingPenaltyApplied ? -25 : 0;

      priorityScore = categoryWeight + dependentsWeight + gasWeight + refillDaysWeight + penaltyWeight;
    }

    const orderData = {
      customerId,
      warehouseId,
      deliveryAddress,
      cylinderCount,
      cylinderType,
      notes: isFlaggedForManualReview 
        ? `[FLAGGED: Suspicious demand pattern detected. Flagged for manual review.] ${notes || ''}`
        : notes,
      priority: isEmergency 
        ? (priorityScore >= 75 ? 'urgent' : priorityScore >= 45 ? 'medium' : 'normal')
        : priority,
      pricePerCylinder,
      subTotal,
      taxAmount,
      deliveryCharge,
      discountAmount,
      totalAmount,
      paymentMode,
      paymentStatus,
      razorpayOrderId,
      // Crisis emergency fields
      isEmergency,
      emergencyCategory,
      emergencyDependents,
      emergencyPurpose,
      gasRemainingPercent,
      lastRefillDate,
      averageMonthlyUsage,
      priorityScore,
      hoardingPenaltyApplied,
    };

    const order = await orderRepository.create(orderData);

    // Emit notification event
    const customer = await userRepository.findById(customerId);
    notificationService.emit('order.created', { order, customer });

    // Cache active order
    await cache.set(`order:${order.orderId}`, order, ACTIVE_ORDER_CACHE_TTL);

    return order;
  }

  /**
   * Fetch orders with role-based filtering.
   * Customers see only their own orders; agents see their assigned orders; admins see all.
   */
  async listOrders({ page = 1, limit = 20, status, warehouseId } = {}, user) {
    const filter = { page: Number(page), limit: Number(limit), status, warehouseId };

    if (user.role === 'customer') {
      filter.customerId = user.id;
    } else if (user.role === 'agent') {
      filter.agentId = user.id;
    }
    // admin: no filter by user — sees all

    const { orders, total } = await orderRepository.findAll(filter);

    // Enrich active emergency bookings with dynamic queue position ranks
    const enrichedOrders = await Promise.all(orders.map(async (o) => {
      if (o.isEmergency && ['created', 'assigned', 'out_for_delivery'].includes(o.status)) {
        const higherScoreCount = await Order.countDocuments({
          isEmergency: true,
          status: { $in: ['created', 'assigned', 'out_for_delivery'] },
          priorityScore: { $gt: o.priorityScore }
        });
        return { ...o, queuePosition: higherScoreCount + 1 };
      }
      return o;
    }));

    return { orders: enrichedOrders, total };
  }

  async getOrder(orderId, user) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Authorization: customers can only see their own orders
    if (
      user.role === 'customer' &&
      order.customerId._id.toString() !== user.id
    ) {
      throw new AppError('Access denied.', 403);
    }

    // Agents can only see their assigned orders
    if (
      user.role === 'agent' &&
      order.agentId &&
      order.agentId._id.toString() !== user.id
    ) {
      throw new AppError('Access denied.', 403);
    }

    if (order.isEmergency && ['created', 'assigned', 'out_for_delivery'].includes(order.status)) {
      const higherScoreCount = await Order.countDocuments({
        isEmergency: true,
        status: { $in: ['created', 'assigned', 'out_for_delivery'] },
        priorityScore: { $gt: order.priorityScore }
      });
      order.queuePosition = higherScoreCount + 1;
    }

    return order;
  }

  /**
   * Admin: assign a delivery agent to an order.
   */
  async assignAgent(orderId, agentId, estimatedDeliveryTime, adminId) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    if (order.status !== 'created') {
      throw new AppError(
        `Cannot assign agent. Order is in '${order.status}' status.`,
        409
      );
    }

    // Verify agent exists and is active
    const agent = await userRepository.findById(agentId);
    if (!agent || agent.role !== 'agent' || !agent.isActive) {
      throw new AppError('Agent not found or inactive.', 404);
    }

    const updated = await orderRepository.assignAgent(
      orderId,
      agentId,
      estimatedDeliveryTime,
      adminId
    );

    if (!updated) throw new AppError('Failed to assign agent. Order may have changed status.', 409);

    // Invalidate cache
    await cache.del(`order:${orderId}`);

    const customer = await userRepository.findById(updated.customerId._id || updated.customerId);
    notificationService.emit('order.assigned', { order: updated, customer, agent });

    return updated;
  }

  /**
   * Update order status (agent or admin).
   * Validates against the status machine.
   */
  async updateStatus(orderId, newStatus, note, userId, userRole, deliveryOtp, extraData = {}) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Authorization
    if (userRole === 'agent') {
      if (!order.agentId || order.agentId._id.toString() !== userId) {
        throw new AppError('You are not assigned to this order.', 403);
      }
      // Agents can cancel (reject) their assigned orders, but not cancel delivered orders
      if (newStatus === 'cancelled' && order.status === 'delivered') {
        throw new AppError('Delivered orders cannot be rejected.', 403);
      }
    }

    // Validate transition
    if (!Order.isValidTransition(order.status, newStatus)) {
      throw new AppError(
        `Invalid status transition: ${order.status} → ${newStatus}. ` +
        `Allowed: ${(Order.STATUS_TRANSITIONS[order.status] || []).join(', ') || 'none'}`,
        409
      );
    }

    let extraFields = {};

    // DELIVERY OTP: Generate when moving to out_for_delivery
    if (newStatus === 'out_for_delivery') {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      extraFields.deliveryOtp = otp;
      const customer = await userRepository.findById(order.customerId._id || order.customerId);
      if (customer?.email) {
        emailService.sendDeliveryOtpEmail(customer.email, otp, order.orderId).catch(() => {});
      }
    }

    // DELIVERY OTP: Verify when marking delivered
    if (newStatus === 'delivered') {
      if (!order.deliveryOtp) throw new AppError('No delivery OTP found for this order. Contact admin.', 400);
      if (!deliveryOtp) throw new AppError('Delivery OTP is required to mark this order as delivered.', 400);
      if (String(order.deliveryOtp) !== String(deliveryOtp)) {
        throw new AppError('Invalid delivery OTP. Please ask the customer for the correct code.', 401);
      }
      if (extraData.deliveredCount) extraFields.deliveredCount = extraData.deliveredCount;
      if (extraData.notes) extraFields.notes = extraData.notes;
    }

    // Store cancellation reason from agent rejection
    if (newStatus === 'cancelled' && extraData.reason) {
      extraFields.cancellationReason = extraData.reason;
    }

    const updated = await orderRepository.updateStatus(orderId, newStatus, note, userId, extraFields);
    await cache.del(`order:${orderId}`);

    const customer = await userRepository.findById(updated.customerId._id || updated.customerId);
    const agent = updated.agentId ? await userRepository.findById(updated.agentId._id || updated.agentId) : null;

    if (newStatus === 'delivered') {
      await inventoryService.commitStock(updated.warehouseId._id || updated.warehouseId, updated.cylinderCount);
      notificationService.emit('order.delivered', { order: updated, customer, agent });
    } else if (newStatus === 'out_for_delivery') {
      notificationService.emit('order.out_for_delivery', { order: updated, customer, agent });
    } else if (newStatus === 'cancelled') {
      await inventoryService.releaseStock(
        updated.warehouseId?._id || updated.warehouseId,
        updated.cylinderCount
      ).catch(() => {});
      notificationService.emit('order.cancelled', { order: updated, customer });
    }

    return updated;
  }

  /**
   * Cancel an order. Releases inventory back to available.
   */
  async cancelOrder(orderId, reason, userId, userRole) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);

    // Customers can only cancel their own orders, and only if not yet out for delivery
    if (userRole === 'customer') {
      if (order.customerId._id.toString() !== userId) {
        throw new AppError('Access denied.', 403);
      }
      if (!['created', 'assigned'].includes(order.status)) {
        throw new AppError(
          'You can only cancel orders that are in "created" or "assigned" status.',
          409
        );
      }
    }

    if (order.status === 'cancelled') throw new AppError('Order is already cancelled.', 409);
    if (order.status === 'delivered') throw new AppError('Delivered orders cannot be cancelled.', 409);

    const updated = await orderRepository.cancelOrder(orderId, reason, userId);
    await cache.del(`order:${orderId}`);

    if (!['delivered'].includes(order.status)) {
      await inventoryService.releaseStock(
        updated.warehouseId?._id || updated.warehouseId,
        updated.cylinderCount
      );
    }

    const customer = await userRepository.findById(updated.customerId?._id || updated.customerId);
    notificationService.emit('order.cancelled', { order: updated, customer });
    return updated;
  }

  /**
   * Set order priority (Admin only).
   */
  async setPriority(orderId, fields) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);
    
    const updateData = {};
    if (typeof fields === 'string') {
      updateData.priority = fields;
    } else {
      if (fields.priority) updateData.priority = fields.priority;
      if (fields.priorityScore !== undefined) {
        updateData.priorityScore = fields.priorityScore;
        if (order.isEmergency) {
          updateData.priority = fields.priorityScore >= 75 ? 'urgent' : fields.priorityScore >= 45 ? 'medium' : 'normal';
        }
      }
    }

    const updated = await Order.findOneAndUpdate(
      { orderId },
      updateData,
      { new: true }
    ).populate('customerId', 'name email phone').lean({ virtuals: true });
    return updated;
  }
  /**
   * Verify Razorpay payment signature
   */
  async verifyPayment(orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature) {
    const order = await orderRepository.findByOrderId(orderId);
    if (!order) throw new AppError('Order not found.', 404);
    if (order.razorpayOrderId !== razorpayOrderId) {
      throw new AppError('Invalid order id for this payment.', 400);
    }

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpaySignature) {
      order.paymentStatus = 'completed';
      order.razorpayPaymentId = razorpayPaymentId;
      await Order.findOneAndUpdate(
        { orderId },
        { paymentStatus: 'completed', razorpayPaymentId }
      );
      await cache.del(`order:${orderId}`);
      return order;
    } else {
      throw new AppError('Payment signature verification failed.', 400);
    }
  }
}

module.exports = new OrderService();
