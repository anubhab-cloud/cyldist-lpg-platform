'use strict';

const asyncHandler = require('../../shared/utils/asyncHandler');
const response = require('../../shared/utils/response');
const userRepository = require('../users/user.repository');
const smsService = require('../../utils/sms');

/**
 * Broadcast an SMS message to a group or a specific user
 * POST /api/v1/notifications/broadcast
 */
const broadcastMessage = asyncHandler(async (req, res) => {
  const { target, customPhone, message } = req.body;

  let recipients = [];

  if (target === 'custom' && customPhone) {
    recipients.push({ phone: customPhone, name: 'User' });
  } else {
    // target can be 'customers', 'agents', or 'all'
    const users = await userRepository.findPhonesByTarget(target);
    recipients = users;
  }

  if (recipients.length === 0) {
    return response.error(res, 404, 'No valid recipients found for this target.');
  }

  // Send messages in parallel chunks (simplified for this scale)
  let successCount = 0;
  let failureCount = 0;

  const results = await Promise.allSettled(
    recipients.map((user) => smsService.sendSMS(user.phone, message))
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value === true) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  return response.success(res, 200, `Broadcast completed.`, {
    totalAttempted: recipients.length,
    successCount,
    failureCount,
  });
});

module.exports = {
  broadcastMessage,
};
