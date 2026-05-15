'use strict';

const logger = require('../../config/logger');
const config = require('../../config');
const whatsappService = require('../../shared/services/whatsapp.service');

/**
 * Notification hooks — stub implementations ready for real integrations.
 *
 * To integrate Twilio, SendGrid, or Firebase:
 * 1. Install the SDK
 * 2. Add credentials to .env
 * 3. Replace the stub logic below with real API calls
 *
 * All functions must return Promises (async).
 */

// ====================================================
// EMAIL HOOKS (SendGrid / Nodemailer stub)
// ====================================================

async function sendOrderCreatedEmail({ order, customer }) {
  // TODO: Replace with real SendGrid/Nodemailer call
  logger.info(`[EMAIL STUB] Order created → ${customer?.email}`, {
    orderId: order?.orderId,
    to: customer?.email,
    subject: `Your cylinder booking #${order?.orderId} is confirmed`,
  });
}

async function sendOrderAssignedEmail({ order, customer, agent }) {
  logger.info(`[EMAIL STUB] Order assigned → ${customer?.email}`, {
    orderId: order?.orderId,
    agentName: agent?.name,
  });
}

async function sendOutForDeliveryNotification({ order, customer }) {
  logger.info(`[EMAIL STUB] Out for delivery → ${customer?.email}`, {
    orderId: order?.orderId,
  });
  if (customer?.phone) {
    await whatsappService.sendTextMessage(
      customer.phone,
      `Your cylinder delivery #${order?.orderId} is OUT FOR DELIVERY. Keep your empty cylinder ready.`
    );
  }
}

async function sendDeliveredNotification({ order, customer }) {
  logger.info(`[EMAIL STUB] Delivered → ${customer?.email}`, {
    orderId: order?.orderId,
  });
  if (customer?.phone) {
    await whatsappService.sendTextMessage(
      customer.phone,
      `Your cylinder delivery #${order?.orderId} has been DELIVERED successfully. Thank you for using CylDist!`
    );
  }
}

async function sendCancelledNotification({ order, customer }) {
  logger.info(`[EMAIL STUB] Cancelled → ${customer?.email}`, {
    orderId: order?.orderId,
    reason: order?.cancellationReason,
  });
}

// ====================================================
// SMS HOOKS (Twilio stub)
// ====================================================

async function sendOrderCreatedSMS({ order, customer }) {
  if (customer?.phone) {
    await whatsappService.sendTextMessage(
      customer.phone,
      `Hello ${customer.name}, your cylinder booking #${order?.orderId} is confirmed and will be processed shortly.`
    );
  } else {
    logger.debug('[SMS STUB] Order created SMS skipped (no phone)');
  }
}

async function sendOrderAssignedSMS({ order, customer, agent }) {
  if (customer?.phone) {
    await whatsappService.sendTextMessage(
      customer.phone,
      `Your cylinder delivery #${order?.orderId} has been assigned to ${agent?.name}. They will contact you soon.`
    );
  }
}

// ====================================================
// PUSH NOTIFICATION HOOKS (FCM stub)
// ====================================================

async function sendOrderCreatedPush({ order, customer }) {
  if (!config.notification.fcmServerKey) {
    logger.debug('[PUSH STUB] FCM not configured, skipping push');
    return;
  }
  // TODO: Replace with FCM admin.messaging().send(...)
  logger.info(`[PUSH STUB] Order created push → user:${customer?._id}`, {
    orderId: order?.orderId,
  });
}

async function sendOrderAssignedPush({ order, customer, agent }) {
  logger.info(`[PUSH STUB] Order assigned push → user:${customer?._id}`, {
    orderId: order?.orderId,
  });
}

// ====================================================
// ADMIN ALERT HOOKS
// ====================================================

async function sendLowStockAlert(warehouse) {
  logger.warn(`[ALERT STUB] Low stock alert: ${warehouse.warehouseName}`, {
    warehouseId: warehouse.warehouseId,
    available: warehouse.availableCylinders,
    threshold: warehouse.lowStockThreshold,
  });
  // TODO: Send email/Slack/PagerDuty alert to operations team
}

// ====================================================
// AUTH HOOKS
// ====================================================

async function sendOtpWhatsApp({ user, otp }) {
  if (user?.phone) {
    await whatsappService.sendTextMessage(
      user.phone,
      `Your CylDist login OTP is: *${otp}*. It will expire in 5 minutes. Do not share this code with anyone.`
    );
  }
  if (user?.email) {
    logger.info(`[EMAIL STUB] OTP for login → ${user.email}`, { otp });
  }
}

module.exports = {
  sendOrderCreatedEmail,
  sendOrderAssignedEmail,
  sendOutForDeliveryNotification,
  sendDeliveredNotification,
  sendCancelledNotification,
  sendOrderCreatedSMS,
  sendOrderAssignedSMS,
  sendOrderCreatedPush,
  sendOrderAssignedPush,
  sendLowStockAlert,
  sendOtpWhatsApp,
};
