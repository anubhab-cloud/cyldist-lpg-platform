'use strict';

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatMessage:
 *       type: object
 *       properties:
 *         messageId:
 *           type: string
 *         chatRoomId:
 *           type: string
 *         senderId:
 *           type: string
 *         senderRole:
 *           type: string
 *           enum: [customer, agent, admin]
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, image, system]
 *         status:
 *           type: string
 *           enum: [sent, delivered, read]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

const chatMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
    },
    chatRoomId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'agent', 'admin'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    type: {
      type: String,
      enum: ['text', 'image', 'system'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    // For image messages: URL (store in S3 / CDN in production)
    mediaUrl: {
      type: String,
    },
    // Read by recipient at
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// --- Indexes ---
chatMessageSchema.index({ chatRoomId: 1, createdAt: 1 }); // For paginated history
chatMessageSchema.index({ senderId: 1 });
chatMessageSchema.index({ status: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
