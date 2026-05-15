'use strict';

const Complaint = require('./support.model');
const AppError = require('../../shared/utils/AppError');

class SupportService {
  /**
   * Create a new complaint.
   * @param {Object} data - Complaint data
   * @param {string} userId - Customer ID
   * @returns {Promise<Object>}
   */
  async createComplaint(data, userId) {
    // If it's a gas leak, automatically escalate to emergency
    if (data.category === 'gas_leak') {
      data.priority = 'emergency';
    }

    const complaint = await Complaint.create({
      ...data,
      user: userId,
    });

    return complaint;
  }

  /**
   * List complaints for a user (or all if admin).
   * @param {Object} query - Query parameters
   * @param {Object} user - User object from auth
   * @returns {Promise<Array>}
   */
  async getComplaints(query, user) {
    const filter = {};
    
    // Customers only see their own complaints
    if (user.role === 'customer') {
      filter.user = user.id;
    }

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;

    const complaints = await Complaint.find(filter)
      .populate('user', 'name email phone')
      .populate('order', 'orderId')
      .sort({ createdAt: -1 })
      .limit(100);

    return complaints;
  }

  /**
   * Get a single complaint by ID.
   * @param {string} id - Complaint ID
   * @param {Object} user - User object
   * @returns {Promise<Object>}
   */
  async getComplaintById(id, user) {
    const complaint = await Complaint.findById(id)
      .populate('user', 'name email phone')
      .populate('order', 'orderId status');

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    // Customers can only access their own
    if (user.role === 'customer' && complaint.user._id.toString() !== user.id) {
      throw new AppError('Access denied', 403);
    }

    return complaint;
  }

  /**
   * Update complaint status/resolution (Admin only).
   * @param {string} id - Complaint ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async updateComplaint(id, data) {
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!complaint) {
      throw new AppError('Complaint not found', 404);
    }

    return complaint;
  }
}

module.exports = new SupportService();
