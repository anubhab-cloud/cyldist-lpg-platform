'use strict';

const whatsappService = require('./whatsapp.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const config = require('../../config/index');

/**
 * Verify Webhook (Used by Meta to authorize the URL)
 */
exports.verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
};

/**
 * Handle incoming messages from WhatsApp
 */
exports.handleIncomingMessage = asyncHandler(async (req, res) => {
  // Send 200 OK immediately as required by Meta API
  res.sendStatus(200);

  const body = req.body;

  if (body.object === 'whatsapp_business_account') {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
      const from = body.entry[0].changes[0].value.messages[0].from; // sender phone number
      const msgBody = body.entry[0].changes[0].value.messages[0].text.body;

      // Ensure this is meant for our configured phone number
      if (phoneNumberId === config.whatsapp.phoneNumberId) {
        await whatsappService.processMessage(from, msgBody);
      }
    }
  }
});
