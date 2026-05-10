'use strict';

const inventoryService = require('./inventory.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Warehouse and cylinder stock management (Admin)
 */

const listWarehouses = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, isActive } = req.query;
  const { warehouses, total } = await inventoryService.listWarehouses({
    page: Number(page),
    limit: Number(limit),
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  return response.success(res, 200, 'Warehouses fetched.', warehouses, response.paginate(total, page, limit));
});

const getWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await inventoryService.getWarehouseById(req.params.id);
  return response.success(res, 200, 'Warehouse fetched.', warehouse);
});

const createWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await inventoryService.createWarehouse({ ...req.body, lastRestockedBy: req.user.id });
  return response.success(res, 201, 'Warehouse created.', warehouse);
});

const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await inventoryService.updateWarehouse(req.params.id, req.body, req.user.id);
  return response.success(res, 200, 'Warehouse updated.', warehouse);
});

const getLowStock = asyncHandler(async (req, res) => {
  const warehouses = await inventoryService.getLowStockWarehouses();
  return response.success(res, 200, 'Low stock warehouses.', warehouses);
});

module.exports = { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, getLowStock };
