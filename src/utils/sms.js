const twilio = require('twilio');
const config = require('../config');
const logger = require('../config/logger');

let client = null;

if (config.notification.twilio.accountSid && config.notification.twilio.authToken) {
  client = twilio(
    config.notification.twilio.accountSid,
    config.notification.twilio.authToken
  );
}

/**
 * Format phone number to E.164 standard required by Twilio
 * @param {string} phone
 * @returns {string}
 */
function _formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  // If it's a 10 digit Indian number, prepend 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return `+${cleaned}`;
}

/**
 * Send an SMS via Twilio
 * @param {string} to - Destination phone number
 * @param {string} body - SMS text body
 * @returns {Promise<boolean>}
 */
const sendSMS = async (to, body) => {
  if (!client || !config.notification.twilio.fromNumber) {
    logger.info(`[SMS Stub] To ${to}: ${body}`);
    return true; // Pretend success in dev mode when keys aren't set
  }

  const formattedPhone = _formatPhoneNumber(to);
  if (!formattedPhone) return false;

  try {
    const message = await client.messages.create({
      body: body,
      from: config.notification.twilio.fromNumber,
      to: formattedPhone,
    });
    logger.info(`SMS sent to ${formattedPhone}, SID: ${message.sid}`);
    return true;
  } catch (error) {
    logger.error('Twilio SMS Error:', {
      message: error.message,
      code: error.code,
    });
    return false;
  }
};

module.exports = {
  sendSMS,
};
