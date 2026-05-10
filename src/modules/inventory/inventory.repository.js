'use strict';

const Inventory = require('./inventory.model');
const AppError = require('../../shared/utils/AppError');

/**
 * Data access layer for Inventory.
 */
class InventoryRepository {
  async findById(id) {
    return Inventory.findById(id).lean({ virtuals: true });
  }

  async findByWarehouseId(warehouseId) {
    return Inventory.findOne({ warehouseId: warehouseId.toUpperCase() }).lean({ virtuals: true });
  }

  async findAll({ page = 1, limit = 20, isActive } = {}) {
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive;

    const [warehouses, total] = await Promise.all([
      Inventory.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ warehouseName: 1 })
        .lean({ virtuals: true }),
      Inventory.countDocuments(filter),
    ]);

    return { warehouses, total };
  }

  async create(data) {
    const warehouse = new Inventory(data);
    await warehouse.save();
    return warehouse.toJSON();
  }

  async updateById(id, updates) {
    return Inventory.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean({
      virtuals: true,
    });
  }

  /**
   * Atomically deduct cylinders from a warehouse.
   * Uses findOneAndUpdate with conditional $inc to prevent race conditions.
   *
   * @param {string} warehouseId - MongoDB _id of the warehouse
   * @param {number} count - Number of cylinders to deduct
   * @returns {Promise<object|null>} Updated inventory doc, or null if insufficient stock
   */
  async deductStock(warehouseId, count) {
    return Inventory.findOneAndUpdate(
      {
        _id: warehouseId,
        availableCylinders: { $gte: count }, // Only deduct if enough stock
      },
      {
        $inc: {
          availableCylinders: -count,
          reservedCylinders: count,
        },
      },
      { new: true }
    ).lean({ virtuals: true });
  }

  /**
   * Release reserved cylinders back to available (order cancelled).
   * @param {string} warehouseId
   * @param {number} count
   */
  async releaseStock(warehouseId, count) {
    return Inventory.findByIdAndUpdate(
      warehouseId,
      {
        $inc: {
          availableCylinders: count,
          reservedCylinders: -count,
        },
      },
      { new: true }
    ).lean({ virtuals: true });
  }

  /**
   * Commit reserved cylinders (order delivered — no longer available or reserved).
   * @param {string} warehouseId
   * @param {number} count
   */
  async commitStock(warehouseId, count) {
    return Inventory.findByIdAndUpdate(
      warehouseId,
      {
        $inc: {
          reservedCylinders: -count,
          totalCylinders: -count,
        },
      },
      { new: true }
    ).lean({ virtuals: true });
  }

  async findLowStock() {
    return Inventory.find({
      $expr: { $lte: ['$availableCylinders', '$lowStockThreshold'] },
      isActive: true,
    }).lean({ virtuals: true });
  }
}

module.exports = new InventoryRepository();
