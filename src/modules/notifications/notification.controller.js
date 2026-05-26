'use strict';

const asyncHandler = require('../../shared/utils/asyncHandler');
const response = require('../../shared/utils/response');
const userRepository = require('../users/user.repository');
const smsService = require('../../utils/sms');

const notificationRepository = require('./notification.repository');

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

  // Save the broadcast log in the database
  await notificationRepository.create({
    type: 'system',
    priority: 'medium',
    icon: '📣',
    title: `Broadcast to ${target.toUpperCase()}`,
    body: `Message: "${message}". Sent successfully to ${successCount}/${recipients.length} recipients.`,
    actions: [`Audience: ${target}`, `Success: ${successCount}`, `Fail: ${failureCount}`],
  });

  return response.success(res, 200, `Broadcast completed.`, {
    totalAttempted: recipients.length,
    successCount,
    failureCount,
  });
});

const getAdminNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, filter } = req.query;
  const result = await notificationRepository.list({ page, limit, filter: filter !== 'All' ? filter : null });
  const unreadCount = await notificationRepository.getUnreadCount();
  
  return response.success(res, 200, 'Notifications fetched.', {
    notifications: result.notifications,
    unreadCount,
  }, response.paginate(result.total, page, limit));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await notificationRepository.markAsRead(id);
  return response.success(res, 200, 'Notification marked as read.');
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationRepository.markAllAsRead();
  return response.success(res, 200, 'All notifications marked as read.');
});

module.exports = {
  broadcastMessage,
  getAdminNotifications,
  markAsRead,
  markAllAsRead,
};
