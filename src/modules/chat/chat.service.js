'use strict';

const chatRepository = require('./chat.repository');
const orderRepository = require('../orders/order.repository');
const AppError = require('../../shared/utils/AppError');

/**
 * Chat service — one-to-one chat between customer and delivery agent per order.
 */
class ChatService {
  /**
   * Validate that a user has access to a chat room.
   * A chat room is accessed via orderId (chatRoomId = orderId).
   *
   * @param {string} chatRoomId - Same as orderId
   * @param {object} user
   */
  async _assertAccess(chatRoomId, user) {
    const order = await orderRepository.findByOrderId(chatRoomId);
    if (!order) throw new AppError('Chat room not found.', 404);

    if (user.role === 'customer') {
      const customerId = order.customerId?._id?.toString() || order.customerId?.toString();
      if (customerId !== user.id) throw new AppError('Access denied.', 403);
    }

    if (user.role === 'agent') {
      const agentId = order.agentId?._id?.toString() || order.agentId?.toString();
      if (agentId !== user.id) throw new AppError('Access denied.', 403);
    }

    return order;
  }

  /**
   * Get paginated message history for a chat room.
   */
  async getMessages(chatRoomId, user, { page = 1, limit = 50 } = {}) {
    await this._assertAccess(chatRoomId, user);

    const result = await chatRepository.findByRoomId(chatRoomId, {
      page: Number(page),
      limit: Number(limit),
    });

    // Mark messages as delivered for this user
    await chatRepository.markAsDelivered(chatRoomId, user.id);

    return result;
  }

  /**
   * Send a message via REST (Socket.IO is the primary path).
   */
  async sendMessage(chatRoomId, user, { content, type = 'text' }) {
    await this._assertAccess(chatRoomId, user);

    if (!content || content.trim().length === 0) {
      throw new AppError('Message content is required.', 400);
    }

    const message = await chatRepository.create({
      chatRoomId,
      senderId: user.id,
      senderRole: user.role === 'agent' ? 'agent' : user.role,
      content: content.trim(),
      type,
    });

    return message;
  }

  /**
   * Mark all messages in a room as read by the current user.
   */
  async markAsRead(chatRoomId, user) {
    await this._assertAccess(chatRoomId, user);
    await chatRepository.markAsRead(chatRoomId, user.id);
    return true;
  }

  /**
   * Get unread message count for a chat room.
   */
  async getUnreadCount(chatRoomId, user) {
    await this._assertAccess(chatRoomId, user);
    return chatRepository.countUnread(chatRoomId, user.id);
  }
}

module.exports = new ChatService();
