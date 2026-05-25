'use strict';

const EventEmitter = require('events');
const logger = require('../../config/logger');
const notificationHooks = require('./notification.hooks');
const notificationRepository = require('./notification.repository');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this._registerListeners();
  }

  async _createAdminAlert(data) {
    try {
      const notification = await notificationRepository.create(data);
      this.emit('admin:notification', notification);
    } catch (err) {
      logger.error('Failed to create admin notification', { error: err.message });
    }
  }

  _registerListeners() {
    this.on('order.created', async (data) => {
      logger.info('Event: order.created', { orderId: data.order?.orderId });
      
      this._createAdminAlert({
        type: 'order',
        priority: 'high',
        icon: '📦',
        title: `New Order #${data.order?.orderId}`,
        body: `Customer ordered ${data.order?.cylinderCount} cylinders. Delivery address: ${data.order?.deliveryAddress?.city}.`,
        relatedId: data.order?.orderId,
      });

      await Promise.allSettled([
        notificationHooks.sendOrderCreatedEmail(data),
        notificationHooks.sendOrderCreatedSMS(data),
        notificationHooks.sendOrderCreatedPush(data),
      ]);
    });

    this.on('order.assigned', async (data) => {
      logger.info('Event: order.assigned', { orderId: data.order?.orderId });
      
      this._createAdminAlert({
        type: 'delivery',
        priority: 'medium',
        icon: '🚚',
        title: `Order Assigned: #${data.order?.orderId}`,
        body: `Agent assigned. Status updated to assigned.`,
        relatedId: data.order?.orderId,
      });

      await Promise.allSettled([
        notificationHooks.sendOrderAssignedEmail(data),
        notificationHooks.sendOrderAssignedSMS(data),
        notificationHooks.sendOrderAssignedPush(data),
      ]);
    });

    this.on('order.out_for_delivery', async (data) => {
      logger.info('Event: order.out_for_delivery', { orderId: data.order?.orderId });
      
      this._createAdminAlert({
        type: 'delivery',
        priority: 'low',
        icon: '🚚',
        title: `Out for Delivery: #${data.order?.orderId}`,
        body: `Agent is on the way to the customer.`,
        relatedId: data.order?.orderId,
      });

      await Promise.allSettled([
        notificationHooks.sendOutForDeliveryNotification(data),
      ]);
    });

    this.on('order.delivered', async (data) => {
      logger.info('Event: order.delivered', { orderId: data.order?.orderId });
      
      this._createAdminAlert({
        type: 'delivery',
        priority: 'low',
        icon: '✅',
        title: `Order Delivered: #${data.order?.orderId}`,
        body: `Delivery successfully completed by agent.`,
        relatedId: data.order?.orderId,
      });

      await Promise.allSettled([
        notificationHooks.sendDeliveredNotification(data),
      ]);
    });

    this.on('order.cancelled', async (data) => {
      logger.info('Event: order.cancelled', { orderId: data.order?.orderId });
      
      this._createAdminAlert({
        type: 'order',
        priority: 'medium',
        icon: '❌',
        title: `Order Cancelled: #${data.order?.orderId}`,
        body: `Order was cancelled.`,
        relatedId: data.order?.orderId,
      });

      await Promise.allSettled([
        notificationHooks.sendCancelledNotification(data),
      ]);
    });

    this.on('inventory.low_stock', async (data) => {
      logger.warn('Event: inventory.low_stock', {
        warehouseId: data.warehouseId,
        available: data.availableCylinders,
      });
      
      this._createAdminAlert({
        type: 'stock',
        priority: 'critical',
        icon: '⚠️',
        title: `Low Stock Alert`,
        body: `Warehouse is running low on cylinders. Available stock: ${data.availableCylinders}.`,
        relatedId: data.warehouseId?.toString(),
        actions: ['Restock Now'],
      });

      await Promise.allSettled([
        notificationHooks.sendLowStockAlert(data),
      ]);
    });

    this.on('auth.otp_requested', async (data) => {
      logger.info('Event: auth.otp_requested', { email: data.user?.email, phone: data.user?.phone });
      await Promise.allSettled([
        notificationHooks.sendOtpEmail(data),
        notificationHooks.sendOtpWhatsApp(data),
        notificationHooks.sendOtpSMS(data),
      ]);
    });

    this.on('error', (err) => {
      logger.error('NotificationService error:', { error: err.message });
    });
  }
}

module.exports = new NotificationService();
