'use strict';

const { z } = require('zod');

const createComplaintSchema = z.object({
  category: z.enum(['gas_leak', 'late_delivery', 'payment_issue', 'damaged_cylinder', 'app_issue', 'other']),
  priority: z.enum(['normal', 'urgent', 'emergency']).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  order: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Order ID').optional(),
});

const updateComplaintSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  resolution: z.string().max(1000).optional(),
});

module.exports = {
  createComplaintSchema,
  updateComplaintSchema,
};
