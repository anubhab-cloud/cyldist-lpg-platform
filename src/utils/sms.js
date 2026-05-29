'use strict';

const axios = require('axios');
const logger = require('../config/logger');

// ═══════════════════════════════════════════════════════════════════════════════
// FAST2SMS SERVICE
// Free SMS API for Indian phone numbers.
// Docs: https://www.fast2sms.com/dev/bulkV2
// ═══════════════════════════════════════════════════════════════════════════════

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || '';
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

/**
 * Send an SMS via Fast2SMS.
 *
 * @param {string} phone - Indian mobile number (10 digits, no +91 prefix)
 * @param {string} message - SMS content
 * @returns {Promise<boolean>} true if sent successfully
 */
async function sendSMS(phone, message) {
  if (!FAST2SMS_API_KEY) {
    logger.debug('[SMS] Fast2SMS API key not configured. Skipping SMS.');
    return false;
  }

  // Strip +91 or 91 prefix if present, keep only 10 digits
  const cleanPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);

  if (cleanPhone.length !== 10) {
    logger.warn(`[SMS] Invalid phone number: ${phone}`);
    return false;
  }

  try {
    const response = await axios.get(FAST2SMS_URL, {
      params: {
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: cleanPhone,
      },
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'cache-control': 'no-cache',
      },
      timeout: 10000,
    });

    if (response.data?.return === true) {
      logger.info(`[SMS] Sent to ${cleanPhone}: "${message.substring(0, 40)}..."`);
      return true;
    } else {
      logger.warn(`[SMS] Fast2SMS returned error: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (err) {
    logger.error(`[SMS] Failed to send to ${cleanPhone}: ${err.message}`);
    return false;
  }
}

/**
 * Send order status SMS to customer.
 */
async function sendOrderStatusSMS(phone, orderId, status) {
  const messages = {
    assigned: `🛢 CylDist: Your order ${orderId} has been assigned to a delivery agent. Track live on our app!`,
    out_for_delivery: `🚚 CylDist: Your cylinder order ${orderId} is out for delivery! Agent is on the way.`,
    delivered: `✅ CylDist: Your order ${orderId} has been delivered successfully. Thank you!`,
    cancelled: `❌ CylDist: Your order ${orderId} has been cancelled. Contact support for help.`,
  };

  const msg = messages[status];
  if (!msg) return false;

  return sendSMS(phone, msg);
}

/**
 * Send delivery OTP SMS to customer.
 */
async function sendDeliveryOtpSMS(phone, otp, orderId) {
  const msg = `🔐 CylDist: Your delivery OTP is ${otp} for order ${orderId}. Share this with the agent to confirm delivery.`;
  return sendSMS(phone, msg);
}

module.exports = { sendSMS, sendOrderStatusSMS, sendDeliveryOtpSMS };
