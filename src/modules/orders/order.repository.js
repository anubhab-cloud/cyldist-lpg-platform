'use strict';

const Order = require('./order.model');

/**
 * Data access layer for Orders.
 */
class OrderRepository {
  async findByOrderId(orderId) {
    return Order.findOne({ orderId })
      .populate('customerId', 'name email phone')
      .populate('agentId', 'name email phone location')
      .populate('warehouseId', 'warehouseName location')
      .lean({ virtuals: true });
  }

  async findById(id) {
    return Order.findById(id)
      .populate('customerId', 'name email phone')
      .populate('agentId', 'name email phone location')
      .populate('warehouseId', 'warehouseName location')
      .lean({ virtuals: true });
  }

  async create(data) {
    const order = new Order(data);
    await order.save();
    return Order.findById(order._id)
      .populate('customerId', 'name email phone')
      .populate('warehouseId', 'warehouseName location')
      .lean({ virtuals: true });
  }

  async findAll({ page = 1, limit = 20, customerId, agentId, status, warehouseId } = {}) {
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (agentId) filter.agentId = agentId;
    if (status) filter.status = status;
    if (warehouseId) filter.warehouseId = warehouseId;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name email phone')
        .populate('agentId', 'name email phone')
        .populate('warehouseId', 'warehouseName')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean({ virtuals: true }),
      Order.countDocuments(filter),
    ]);

    return { orders, total };
  }

  async assignAgent(orderId, agentId, estimatedDeliveryTime, updatedBy) {
    return Order.findOneAndUpdate(
      { orderId, status: 'created' },
      {
        agentId,
        status: 'assigned',
        estimatedDeliveryTime,
        $push: {
          timeline: { status: 'assigned', timestamp: new Date(), updatedBy },
        },
      },
      { new: true }
    )
      .populate('customerId', 'name email phone')
      .populate('agentId', 'name email phone')
      .lean({ virtuals: true });
  }

  async updateStatus(orderId, status, note = '', updatedBy = null) {
    const updates = {
      status,
      $push: {
        timeline: {
          status,
          timestamp: new Date(),
          note,
          updatedBy,
        },
      },
    };

    if (status === 'delivered') {
      updates.deliveredAt = new Date();
    }

    return Order.findOneAndUpdate({ orderId }, updates, { new: true })
      .populate('customerId', 'name email phone')
      .populate('agentId', 'name email phone')
      .lean({ virtuals: true });
  }

  async cancelOrder(orderId, reason, updatedBy) {
    return Order.findOneAndUpdate(
      { orderId },
      {
        status: 'cancelled',
        cancellationReason: reason,
        $push: {
          timeline: {
            status: 'cancelled',
            timestamp: new Date(),
            note: reason,
            updatedBy,
          },
        },
      },
      { new: true }
    ).lean({ virtuals: true });
  }

  async countActiveByAgent(agentId) {
    return Order.countDocuments({
      agentId,
      status: { $in: ['assigned', 'out_for_delivery'] },
    });
  }
}

module.exports = new OrderRepository();
