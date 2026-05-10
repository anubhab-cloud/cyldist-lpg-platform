'use strict';

const User = require('./user.model');

/**
 * Data access layer for Users.
 * All database queries go through this layer — services never talk to Mongoose directly.
 */
class UserRepository {
  async findByEmail(email, includePassword = false) {
    const query = User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (includePassword) {
      query.select('+passwordHash +refreshTokenHash');
    }
    return query.lean({ virtuals: true });
  }

  async findById(id, includePassword = false) {
    const query = User.findOne({ _id: id, deletedAt: null });
    if (includePassword) {
      query.select('+passwordHash +refreshTokenHash');
    }
    return query.lean({ virtuals: true });
  }

  async create(data) {
    const user = new User(data);
    await user.save();
    return user.toJSON();
  }

  async updateById(id, updates) {
    return User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean({
      virtuals: true,
    });
  }

  async updateRefreshToken(id, tokenHash) {
    return User.findByIdAndUpdate(
      id,
      { refreshTokenHash: tokenHash },
      { new: true, writeConcern: { w: 'majority' } }
    );
  }

  async softDelete(id) {
    return User.findByIdAndUpdate(id, { deletedAt: new Date(), isActive: false });
  }

  async findAll({ page = 1, limit = 20, role, isActive } = {}) {
    const filter = { deletedAt: null };
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive;

    const [users, total] = await Promise.all([
      User.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean({ virtuals: true }),
      User.countDocuments(filter),
    ]);

    return { users, total };
  }

  async findAvailableAgents() {
    return User.find({ role: 'agent', isActive: true, isOnDuty: true, deletedAt: null })
      .lean({ virtuals: true })
      .select('name email phone location isOnDuty');
  }

  async addAddress(userId, address) {
    return User.findByIdAndUpdate(
      userId,
      { $push: { addresses: address } },
      { new: true, runValidators: true }
    ).lean({ virtuals: true });
  }

  async removeAddress(userId, addressId) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    ).lean({ virtuals: true });
  }

  async updateLocation(userId, lat, lng) {
    return User.findByIdAndUpdate(
      userId,
      { 'location.lat': lat, 'location.lng': lng },
      { new: true }
    ).lean({ virtuals: true });
  }
}

module.exports = new UserRepository();
