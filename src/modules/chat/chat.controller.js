'use strict';

const chatService = require('./chat.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Order-based real-time chat between customer and delivery agent
 */

const getMessages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const { messages, total } = await chatService.getMessages(
    req.params.chatRoomId, req.user, { page, limit }
  );
  return response.success(
    res, 200, 'Messages fetched.', messages,
    response.paginate(total, page, limit)
  );
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await chatService.sendMessage(
    req.params.chatRoomId, req.user, req.body
  );
  return response.success(res, 201, 'Message sent.', message);
});

const markAsRead = asyncHandler(async (req, res) => {
  await chatService.markAsRead(req.params.chatRoomId, req.user);
  return response.success(res, 200, 'Messages marked as read.');
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await chatService.getUnreadCount(req.params.chatRoomId, req.user);
  return response.success(res, 200, 'Unread count fetched.', { unreadCount: count });
});

module.exports = { getMessages, sendMessage, markAsRead, getUnreadCount };
