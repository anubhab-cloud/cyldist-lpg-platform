'use strict';

const inventoryRepository = require('./inventory.repository');
const notificationService = require('../notifications/notification.service');
const cache = require('../../shared/cache/redis.cache');
const AppError = require('../../shared/utils/AppError');
const config = require('../../config');

const CACHE_TTL = 30; // seconds — stock cache TTL
const cacheKey = (warehouseId) => `inventory:stock:${warehouseId}`;

/**
 * Inventory management service.
 */
class InventoryService {
  async listWarehouses({ page, limit, isActive } = {}) {
    const result = await inventoryRepository.findAll({ page, limit, isActive });

    // Check low stock and emit alerts
    const lowStock = result.warehouses.filter(
      (w) => w.availableCylinders <= w.lowStockThreshold
    );
    for (const warehouse of lowStock) {
      notificationService.emit('inventory.low_stock', warehouse);
    }

    return result;
  }

  async getWarehouse(warehouseId) {
    // Try cache first
    const cached = await cache.get(cacheKey(warehouseId));
    if (cached) return cached;

    const warehouse = await inventoryRepository.findByWarehouseId(warehouseId);
    if (!warehouse) throw new AppError('Warehouse not found.', 404);

    await cache.set(cacheKey(warehouseId), warehouse, CACHE_TTL);
    return warehouse;
  }

  async getWarehouseById(id) {
    const warehouse = await inventoryRepository.findById(id);
    if (!warehouse) throw new AppError('Warehouse not found.', 404);
    return warehouse;
  }

  async createWarehouse(data) {
    const existing = await inventoryRepository.findByWarehouseId(data.warehouseId);
    if (existing) throw new AppError('Warehouse ID already exists.', 409);

    // availableCylinders = totalCylinders on creation
    data.availableCylinders = data.totalCylinders;
    return inventoryRepository.create(data);
  }

  async updateWarehouse(id, updates, adminId) {
    const warehouse = await inventoryRepository.findById(id);
    if (!warehouse) throw new AppError('Warehouse not found.', 404);

    if (updates.totalCylinders !== undefined) {
      const diff = updates.totalCylinders - warehouse.totalCylinders;
      updates.availableCylinders = Math.max(0, warehouse.availableCylinders + diff);
      updates.lastRestockedAt = new Date();
      updates.lastRestockedBy = adminId;
    }

    const updated = await inventoryRepository.updateById(id, updates);

    // Invalidate cache
    await cache.del(cacheKey(updated.warehouseId));

    // Check low stock after update
    if (updated.availableCylinders <= updated.lowStockThreshold) {
      notificationService.emit('inventory.low_stock', updated);
    }

    return updated;
  }

  /**
   * Deduct stock for an order. Returns the updated warehouse.
   * Throws if insufficient stock.
   *
   * @param {string} warehouseId - MongoDB _id
   * @param {number} count
   * @returns {Promise<object>}
   */
  async deductStock(warehouseId, count) {
    const updated = await inventoryRepository.deductStock(warehouseId, count);

    if (!updated) {
      // Either warehouse not found or insufficient stock
      const warehouse = await inventoryRepository.findById(warehouseId);
      if (!warehouse) throw new AppError('Warehouse not found.', 404);
      throw new AppError(
        `Insufficient stock. Available: ${warehouse.availableCylinders}, Requested: ${count}`,
        409
      );
    }

    // Invalidate cache after stock change
    await cache.del(cacheKey(updated.warehouseId));

    // Emit low stock alert
    if (updated.availableCylinders <= updated.lowStockThreshold) {
      notificationService.emit('inventory.low_stock', updated);
    }

    return updated;
  }

  async releaseStock(warehouseId, count) {
    const updated = await inventoryRepository.releaseStock(warehouseId, count);
    if (updated) await cache.del(cacheKey(updated.warehouseId));
    return updated;
  }

  async commitStock(warehouseId, count) {
    const updated = await inventoryRepository.commitStock(warehouseId, count);
    if (updated) await cache.del(cacheKey(updated.warehouseId));
    return updated;
  }

  async getLowStockWarehouses() {
    return inventoryRepository.findLowStock();
  }
}

module.exports = new InventoryService();
