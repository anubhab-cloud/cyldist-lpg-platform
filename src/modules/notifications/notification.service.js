'use strict';

const EventEmitter = require('events');
const logger = require('../../config/logger');
const notificationHooks = require('./notification.hooks');

/**
 * Central event-driven notification bus.
 * 
 * Decouples business events from their side effects (email, SMS, push).
 * Services emit events; this bus routes them to notification hooks.
 * 
 * Events:
 *   - order.created    { order, customer }
 *   - order.assigned   { order, customer, agent }
 *   - order.out_for_delivery { order, customer, agent }
 *   - order.delivered  { order, customer, agent }
 *   - order.cancelled  { order, customer }
 *   - inventory.low_stock { warehouse }
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this._registerListeners();
  }

  _registerListeners() {
    this.on('order.created', async (data) => {
      logger.info('Event: order.created', { orderId: data.order?.orderId });
      await Promise.allSettled([
        notificationHooks.sendOrderCreatedEmail(data),
        notificationHooks.sendOrderCreatedSMS(data),
        notificationHooks.sendOrderCreatedPush(data),
      ]);
    });

    this.on('order.assigned', async (data) => {
      logger.info('Event: order.assigned', { orderId: data.order?.orderId });
      await Promise.allSettled([
        notificationHooks.sendOrderAssignedEmail(data),
        notificationHooks.sendOrderAssignedSMS(data),
        notificationHooks.sendOrderAssignedPush(data),
      ]);
    });

    this.on('order.out_for_delivery', async (data) => {
      logger.info('Event: order.out_for_delivery', { orderId: data.order?.orderId });
      await Promise.allSettled([
        notificationHooks.sendOutForDeliveryNotification(data),
      ]);
    });

    this.on('order.delivered', async (data) => {
      logger.info('Event: order.delivered', { orderId: data.order?.orderId });
      await Promise.allSettled([
        notificationHooks.sendDeliveredNotification(data),
      ]);
    });

    this.on('order.cancelled', async (data) => {
      logger.info('Event: order.cancelled', { orderId: data.order?.orderId });
      await Promise.allSettled([
        notificationHooks.sendCancelledNotification(data),
      ]);
    });

    this.on('inventory.low_stock', async (data) => {
      logger.warn('Event: inventory.low_stock', {
        warehouseId: data.warehouseId,
        available: data.availableCylinders,
      });
      await Promise.allSettled([
        notificationHooks.sendLowStockAlert(data),
      ]);
    });

    this.on('auth.otp_requested', async (data) => {
      logger.info('Event: auth.otp_requested', { email: data.user?.email, phone: data.user?.phone });
      await Promise.allSettled([
        notificationHooks.sendOtpWhatsApp(data),
      ]);
    });

    // Global error guard — prevent unhandled event errors from crashing the process
    this.on('error', (err) => {
      logger.error('NotificationService error:', { error: err.message });
    });
  }
}

module.exports = new NotificationService();
