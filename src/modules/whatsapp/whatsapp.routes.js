'use strict';

const express = require('express');
const router = express.Router();
const whatsappController = require('./whatsapp.controller');

/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: Meta WhatsApp Cloud API webhooks
 */

// GET webhook is used by Meta for verifying the Webhook URL
router.get('/webhook', whatsappController.verifyWebhook);

// POST webhook is where Meta sends incoming WhatsApp messages
router.post('/webhook', whatsappController.handleIncomingMessage);

module.exports = router;
