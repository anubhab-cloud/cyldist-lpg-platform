'use strict';

const ChatMessage = require('./chat.model');

/**
 * Data access layer for Chat Messages.
 */
class ChatRepository {
  async findByRoomId(chatRoomId, { page = 1, limit = 50 } = {}) {
    const [messages, total] = await Promise.all([
      ChatMessage.find({ chatRoomId })
        .populate('senderId', 'name role')
        .sort({ createdAt: -1 }) // Latest first for pagination
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: true }),
      ChatMessage.countDocuments({ chatRoomId }),
    ]);

    return { messages: messages.reverse(), total }; // Return chronological order
  }

  async create(data) {
    const message = new ChatMessage(data);
    await message.save();
    return ChatMessage.findById(message._id).populate('senderId', 'name role').lean({ virtuals: true });
  }

  async markAsRead(chatRoomId, recipientId) {
    return ChatMessage.updateMany(
      {
        chatRoomId,
        senderId: { $ne: recipientId }, // Messages not sent by this user
        status: { $in: ['sent', 'delivered'] },
      },
      {
        status: 'read',
        readAt: new Date(),
      }
    );
  }

  async markAsDelivered(chatRoomId, recipientId) {
    return ChatMessage.updateMany(
      {
        chatRoomId,
        senderId: { $ne: recipientId },
        status: 'sent',
      },
      { status: 'delivered' }
    );
  }

  async countUnread(chatRoomId, userId) {
    return ChatMessage.countDocuments({
      chatRoomId,
      senderId: { $ne: userId },
      status: { $in: ['sent', 'delivered'] },
    });
  }

  async findByMessageId(messageId) {
    return ChatMessage.findOne({ messageId }).lean({ virtuals: true });
  }
}

module.exports = new ChatRepository();
