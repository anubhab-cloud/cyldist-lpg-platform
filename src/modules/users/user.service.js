'use strict';

const userRepository = require('./user.repository');
const AppError = require('../../shared/utils/AppError');
const User = require('./user.model');
const Order = require('../orders/order.model');

/**
 * User management service.
 * Handles profile, address, and admin user operations.
 */
class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async updateProfile(userId, updates) {
    const { name, phone, location } = updates;
    const allowedUpdates = {};
    if (name) allowedUpdates.name = name;
    if (phone) allowedUpdates.phone = phone;
    if (location) allowedUpdates.location = location;

    const user = await userRepository.updateById(userId, allowedUpdates);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AppError('User not found.', 404);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw new AppError('Current password is incorrect.', 400);

    const passwordHash = await User.hashPassword(newPassword);
    await userRepository.updateById(userId, { passwordHash });
    return true;
  }

  async addAddress(userId, addressData) {
    const user = await userRepository.addAddress(userId, addressData);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async removeAddress(userId, addressId) {
    const user = await userRepository.removeAddress(userId, addressId);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async addWalletFunds(userId, amount) {
    if (amount <= 0) throw new AppError('Amount must be greater than zero.', 400);
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: amount } },
      { new: true }
    );
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async submitKyc(userId, { documentType, documentNumber, documentImageUrl }) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    if (user.kycStatus === 'verified') throw new AppError('KYC already verified.', 400);

    user.kycStatus = 'submitted';
    user.kycDetails = {
      documentType,
      documentNumber,
      documentImageUrl,
      submittedAt: new Date(),
    };
    await user.save();
    return user;
  }

  // === Admin operations ===

  async listPendingKyc({ page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    const users = await User.find({ kycStatus: 'submitted' }).skip(skip).limit(limit).sort({ 'kycDetails.submittedAt': 1 });
    const total = await User.countDocuments({ kycStatus: 'submitted' });
    return { data: users, total, page, limit };
  }

  async updateKycStatus(userId, { status }) {
    if (!['verified', 'rejected'].includes(status)) throw new AppError('Invalid status.', 400);
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found.', 404);

    user.kycStatus = status;
    if (status === 'verified') {
      user.kycDetails.verifiedAt = new Date();
    }
    await user.save();
    return user;
  }

  async listUsers({ page, limit, role, isActive }) {
    return userRepository.findAll({ page, limit, role, isActive });
  }

  async getUserById(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async changeRole(userId, newRole) {
    if (!['customer', 'admin', 'agent'].includes(newRole)) {
      throw new AppError('Invalid role.', 400);
    }
    const user = await userRepository.updateById(userId, { role: newRole });
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async toggleActive(userId, isActive) {
    const user = await userRepository.updateById(userId, { isActive });
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  async getAvailableAgents() {
    return userRepository.findAvailableAgents();
  }

  async updateAgentDutyStatus(agentId, isOnDuty) {
    const user = await userRepository.updateById(agentId, { isOnDuty });
    if (!user) throw new AppError('Agent not found.', 404);
    return user;
  }

  async getAgentsPerformance() {
    const agents = await User.find({ role: 'agent' }).lean();
    
    const performanceData = await Promise.all(
      agents.map(async (agent) => {
        const completedCount = await Order.countDocuments({ agentId: agent._id, status: 'delivered' });
        const activeCount = await Order.countDocuments({ agentId: agent._id, status: { $in: ['assigned', 'out_for_delivery'] } });
        const cancelledCount = await Order.countDocuments({ agentId: agent._id, status: 'cancelled' });
        
        const total = completedCount + cancelledCount;
        const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 100;
        
        // Generate consistent rating baseline
        let rating = 4.5;
        if (completedCount > 10) rating = 4.9;
        else if (completedCount > 5) rating = 4.8;
        else if (completedCount > 0) rating = 4.7;
        
        return {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          isOnDuty: agent.isOnDuty,
          isActive: agent.isActive,
          location: agent.location,
          completedCount,
          activeCount,
          cancelledCount,
          successRate,
          rating,
        };
      })
    );
    
    return performanceData;
  }
}

module.exports = new UserService();
