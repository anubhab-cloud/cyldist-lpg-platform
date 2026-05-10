'use strict';

const { Router } = require('express');
const controller = require('./chat.controller');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { authorize } = require('../../shared/middleware/rbac.middleware');

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /chat/{chatRoomId}/messages:
 *   get:
 *     summary: Get paginated message history for a chat room
 *     tags: [Chat]
 *   post:
 *     summary: Send a message (REST fallback — use Socket.IO for real-time)
 *     tags: [Chat]
 * /chat/{chatRoomId}/read:
 *   patch:
 *     summary: Mark all messages in room as read
 *     tags: [Chat]
 * /chat/{chatRoomId}/unread:
 *   get:
 *     summary: Get unread message count
 *     tags: [Chat]
 */

router.get('/:chatRoomId/messages', authorize('customer', 'agent', 'admin'), controller.getMessages);
router.post('/:chatRoomId/messages', authorize('customer', 'agent'), controller.sendMessage);
router.patch('/:chatRoomId/read', authorize('customer', 'agent'), controller.markAsRead);
router.get('/:chatRoomId/unread', authorize('customer', 'agent'), controller.getUnreadCount);

module.exports = router;
