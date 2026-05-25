'use strict';

const axios = require('axios');
const config = require('../../config/index');
const WhatsAppSession = require('./whatsapp.model');
const Order = require('../orders/order.model');
const User = require('../users/user.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Send a plain text message via WhatsApp Cloud API
 */
const sendMessage = async (to, text) => {
  try {
    const url = `https://graph.facebook.com/v17.0/${config.whatsapp.phoneNumberId}/messages`;
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[WhatsApp Service] Error sending message:', error.response?.data || error.message);
  }
};

/**
 * Send the main interactive menu
 */
const sendMenu = async (to) => {
  const menuText = `*Welcome to GasFlow LPG Services* ⛽

Please reply with the number of the option you want to choose:
1️⃣ New Cylinder Booking
2️⃣ Refill Booking
3️⃣ New Connection
4️⃣ Track Order
5️⃣ Customer Support`;
  await sendMessage(to, menuText);
};

/**
 * Main function to process incoming messages based on user state
 */
exports.processMessage = async (from, text) => {
  // Find or create session
  let session = await WhatsAppSession.findOne({ phoneNumber: from });
  if (!session) {
    session = new WhatsAppSession({ phoneNumber: from, currentStep: 'idle' });
  }

  // Update interaction time
  session.lastInteraction = new Date();

  const msg = text.trim();

  // If user says hi, hello, menu, or cancels at any point
  if (['hi', 'hello', 'menu', 'cancel', 'reset'].includes(msg.toLowerCase())) {
    session.currentStep = 'menu';
    session.tempData = {};
    await session.save();
    return await sendMenu(from);
  }

  // Handle based on current step
  switch (session.currentStep) {
    case 'idle':
    case 'menu':
      await handleMenuSelection(msg, session, from);
      break;

    // --- Option 1: New Booking Flow ---
    case 'booking_name':
      session.tempData.name = msg;
      session.currentStep = 'booking_address';
      await sendMessage(from, `Thanks ${msg}. Please provide your complete delivery address.`);
      break;
    case 'booking_address':
      session.tempData.address = msg;
      session.currentStep = 'booking_type';
      await sendMessage(from, `What type of cylinder do you need? (e.g., 14.2kg Domestic, 19kg Commercial)`);
      break;
    case 'booking_type':
      session.tempData.type = msg;
      session.currentStep = 'booking_qty';
      await sendMessage(from, `How many cylinders do you need? (Reply with a number)`);
      break;
    case 'booking_qty':
      session.tempData.qty = parseInt(msg) || 1;
      await finalizeNewBooking(session, from);
      break;

    // --- Option 2: Refill Booking Flow ---
    case 'refill_customerId':
      session.tempData.customerId = msg;
      session.currentStep = 'refill_qty';
      await sendMessage(from, `How many cylinders do you want to refill?`);
      break;
    case 'refill_qty':
      session.tempData.qty = parseInt(msg) || 1;
      await finalizeRefill(session, from);
      break;

    // --- Option 3: New Connection Flow ---
    case 'newconn_name':
      session.tempData.name = msg;
      session.currentStep = 'newconn_aadhaar';
      await sendMessage(from, `Please enter your Aadhaar Number (Mock entry for verification):`);
      break;
    case 'newconn_aadhaar':
      session.tempData.aadhaar = msg;
      session.currentStep = 'newconn_address';
      await sendMessage(from, `Please enter your installation address:`);
      break;
    case 'newconn_address':
      session.tempData.address = msg;
      session.currentStep = 'newconn_mobile';
      await sendMessage(from, `Please provide an alternate contact number (or reply 'same' to use this WhatsApp number):`);
      break;
    case 'newconn_mobile':
      session.tempData.mobile = msg.toLowerCase() === 'same' ? from : msg;
      await finalizeNewConnection(session, from);
      break;

    // --- Option 4: Track Order Flow ---
    case 'track_orderId':
      await handleTracking(msg, session, from);
      break;

    default:
      await sendMessage(from, "I didn't quite catch that. Reply *Menu* to start over.");
      session.currentStep = 'menu';
      break;
  }

  await session.save();
};

const handleMenuSelection = async (msg, session, from) => {
  switch (msg) {
    case '1':
      session.currentStep = 'booking_name';
      await sendMessage(from, `Let's book a new cylinder.\nPlease enter your *Full Name*:`);
      break;
    case '2':
      session.currentStep = 'refill_customerId';
      await sendMessage(from, `Let's book a refill.\nPlease enter your *Customer ID*:`);
      break;
    case '3':
      session.currentStep = 'newconn_name';
      await sendMessage(from, `Let's set up a new connection.\nPlease enter your *Full Name*:`);
      break;
    case '4':
      session.currentStep = 'track_orderId';
      await sendMessage(from, `Please enter your *Order ID* (e.g. ORD-XYZ123):`);
      break;
    case '5':
      session.currentStep = 'idle';
      await sendMessage(from, `*Customer Support* 📞\n\nCall us: 1800-2333-555\nEmail: support@gasflow.local\n\nOur agents are available 24/7.`);
      break;
    default:
      await sendMessage(from, "Invalid option. Please reply with a number between 1 and 5.");
      break;
  }
};

const finalizeNewBooking = async (session, from) => {
  // Mock order creation logic
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  
  await sendMessage(from, `✅ *Booking Confirmed!*\n\n*Name:* ${session.tempData.name}\n*Address:* ${session.tempData.address}\n*Type:* ${session.tempData.type}\n*Qty:* ${session.tempData.qty}\n\n*Order ID:* ${orderId}\n\nThank you for choosing GasFlow! Reply *Menu* to return to the main menu.`);
  
  session.currentStep = 'idle';
  session.tempData = {};
};

const finalizeRefill = async (session, from) => {
  const orderId = 'REF-' + Math.floor(100000 + Math.random() * 900000);
  
  await sendMessage(from, `✅ *Refill Booked!*\n\n*Customer ID:* ${session.tempData.customerId}\n*Qty:* ${session.tempData.qty}\n\n*Order ID:* ${orderId}\nWe will deliver it within 24-48 hours.\n\nReply *Menu* to return to the main menu.`);
  
  session.currentStep = 'idle';
  session.tempData = {};
};

const finalizeNewConnection = async (session, from) => {
  const connId = 'CONN-' + Math.floor(1000 + Math.random() * 9000);
  
  await sendMessage(from, `✅ *New Connection Request Registered!*\n\n*Name:* ${session.tempData.name}\n*Address:* ${session.tempData.address}\n*Ref Number:* ${connId}\n\nOur agent will contact you shortly at ${session.tempData.mobile} to complete KYC verification.\n\nReply *Menu* to return.`);
  
  session.currentStep = 'idle';
  session.tempData = {};
};

const handleTracking = async (orderId, session, from) => {
  // Mock tracking
  await sendMessage(from, `📍 *Tracking Status for ${orderId}:*\n\nStatus: *Out for Delivery* 🚚\nExpected Arrival: *Today by 5:00 PM*\n\nReply *Menu* to return.`);
  
  session.currentStep = 'idle';
};
