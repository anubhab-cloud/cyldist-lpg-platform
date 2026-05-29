'use strict';

const mongoose = require('mongoose');
const Order = require('./order.model');
const User = require('../users/user.model');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * GET /api/v1/orders/analytics
 * Returns pre-computed dashboard stats using MongoDB aggregation pipelines.
 * Admin only.
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // --- 1. Overall counts & revenue ---
  const [statusCounts] = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        activeOrders: {
          $sum: {
            $cond: [{ $in: ['$status', ['created', 'assigned', 'out_for_delivery']] }, 1, 0],
          },
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
        revenue: {
          $sum: {
            $cond: [{ $eq: ['$status', 'delivered'] }, '$totalAmount', 0],
          },
        },
      },
    },
  ]);

  const counts = statusCounts || {
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    revenue: 0,
  };

  // --- 2. Orders by status breakdown ---
  const statusBreakdownRaw = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const ordersByStatus = {
    created: 0,
    assigned: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };
  statusBreakdownRaw.forEach((s) => {
    if (ordersByStatus.hasOwnProperty(s._id)) {
      ordersByStatus[s._id] = s.count;
    }
  });

  // --- 3. Average delivery time (delivered orders with deliveredAt) ---
  const [avgDelivery] = await Order.aggregate([
    { $match: { status: 'delivered', deliveredAt: { $ne: null } } },
    {
      $project: {
        deliveryTimeMs: { $subtract: ['$deliveredAt', '$createdAt'] },
      },
    },
    {
      $group: {
        _id: null,
        avgMs: { $avg: '$deliveryTimeMs' },
      },
    },
  ]);

  const avgDeliveryTimeMinutes = avgDelivery
    ? Math.round(avgDelivery.avgMs / 60000)
    : 0;

  // --- 4. Last 7 days trend ---
  const last7DaysTrend = await Order.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        orders: 1,
        revenue: 1,
      },
    },
  ]);

  // --- 5. Top 5 agents by deliveries ---
  const topAgentsRaw = await Order.aggregate([
    { $match: { status: 'delivered', agentId: { $ne: null } } },
    {
      $group: {
        _id: '$agentId',
        deliveries: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
    { $sort: { deliveries: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent',
      },
    },
    { $unwind: '$agent' },
    {
      $project: {
        _id: 0,
        name: '$agent.name',
        deliveries: 1,
        avgRating: { $round: [{ $ifNull: ['$avgRating', 0] }, 1] },
      },
    },
  ]);

  // --- 6. Recent 10 orders (populated) ---
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('customerId', 'name email phone')
    .populate('agentId', 'name email phone')
    .populate('warehouseId', 'warehouseName warehouseId')
    .lean();

  return response.success(res, 200, 'Analytics fetched successfully.', {
    totalOrders: counts.totalOrders,
    activeOrders: counts.activeOrders,
    deliveredOrders: counts.deliveredOrders,
    cancelledOrders: counts.cancelledOrders,
    revenue: counts.revenue,
    avgDeliveryTimeMinutes,
    ordersByStatus,
    last7DaysTrend,
    topAgents: topAgentsRaw,
    recentOrders,
  });
});

module.exports = { getAnalytics };
