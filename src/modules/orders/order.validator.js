'use strict';

const { z } = require('zod');

const deliveryAddressSchema = z.object({
  label: z.string().max(50).optional(),
  line1: z.string().min(5, 'Address line 1 is required'),
  line2: z.string().optional().default(''),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

const createOrderSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  deliveryAddress: deliveryAddressSchema,
  cylinderCount: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional().default(''),
  pricePerCylinder: z.number().min(0).optional().default(0),
});

const assignAgentSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  estimatedDeliveryTime: z.string().datetime({ offset: true }).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['out_for_delivery', 'delivered', 'cancelled']),
  note: z.string().max(200).optional().default(''),
});

const cancelOrderSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(200),
});

const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum(['created', 'assigned', 'out_for_delivery', 'delivered', 'cancelled'])
    .optional(),
  warehouseId: z.string().optional(),
});

module.exports = {
  createOrderSchema,
  assignAgentSchema,
  updateStatusSchema,
  cancelOrderSchema,
  listOrdersQuerySchema,
};
