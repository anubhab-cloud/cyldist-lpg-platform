'use strict';

const chatService = require('../modules/chat/chat.service');
const chatRepository = require('../modules/chat/chat.repository');
const logger = require('../config/logger');

/**
 * Register chat event handlers for a socket.
 *
 * Events (client → server):
 *   chat:join        { chatRoomId } — Join a chat room
 *   chat:leave       { chatRoomId }
 *   chat:send        { chatRoomId, content, type? }
 *   chat:typing      { chatRoomId }
 *   chat:stop_typing { chatRoomId }
 *   chat:read        { chatRoomId }
 *
 * Events (server → room):
 *   chat:message       — New message broadcast
 *   chat:typing        — User is typing
 *   chat:stop_typing   — User stopped typing
 *   chat:read_receipt  — Messages marked as read
 *
 * @param {import('socket.io').Socket} socket
 * @param {import('socket.io').Server} io
 */
function registerChatHandlers(socket, io) {
  const user = socket.user;

  /**
   * Join a chat room (identified by chatRoomId = orderId).
   */
  socket.on('chat:join', async ({ chatRoomId }) => {
    try {
      if (!chatRoomId) {
        socket.emit('error', { message: 'chatRoomId is required.' });
        return;
      }

      // Validate access — only customer and their assigned agent
      // Use service which checks order ownership
      const { messages } = await chatService.getMessages(chatRoomId, user, { page: 1, limit: 20 });

      const room = `chat:${chatRoomId}`;
      socket.join(room);

      // Send recent message history on join
      socket.emit('chat:history', { chatRoomId, messages });

      logger.info(`User ${user.id} (${user.role}) joined chat room ${chatRoomId}`);
    } catch (err) {
      socket.emit('error', { message: err.message || 'Failed to join chat room.' });
    }
  });

  /**
   * Leave a chat room.
   */
  socket.on('chat:leave', ({ chatRoomId }) => {
    socket.leave(`chat:${chatRoomId}`);
    logger.info(`User ${user.id} left chat room ${chatRoomId}`);
  });

  /**
   * Send a chat message.
   */
  socket.on('chat:send', async ({ chatRoomId, content, type = 'text' }) => {
    try {
      if (!chatRoomId || !content) {
        socket.emit('error', { message: 'chatRoomId and content are required.' });
        return;
      }

      const message = await chatService.sendMessage(chatRoomId, user, { content, type });

      const room = `chat:${chatRoomId}`;
      // Broadcast to everyone in the room (including sender for confirmation)
      io.to(room).emit('chat:message', message);

      logger.debug(`Message sent in room ${room}`, { senderId: user.id });
    } catch (err) {
      socket.emit('error', { message: err.message || 'Failed to send message.' });
    }
  });

  /**
   * Typing indicators — broadcast to others in the room.
   */
  socket.on('chat:typing', ({ chatRoomId }) => {
    socket.to(`chat:${chatRoomId}`).emit('chat:typing', {
      userId: user.id,
      role: user.role,
    });
  });

  socket.on('chat:stop_typing', ({ chatRoomId }) => {
    socket.to(`chat:${chatRoomId}`).emit('chat:stop_typing', {
      userId: user.id,
    });
  });

  /**
   * Mark messages as read.
   */
  socket.on('chat:read', async ({ chatRoomId }) => {
    try {
      await chatRepository.markAsRead(chatRoomId, user.id);

      // Notify the other party that messages were read
      socket.to(`chat:${chatRoomId}`).emit('chat:read_receipt', {
        chatRoomId,
        readBy: user.id,
        readAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error('chat:read error:', { error: err.message });
    }
  });
}

module.exports = { registerChatHandlers };
