'use strict';

const { z } = require('zod');

const addressSchema = z.object({
  label: z.string().max(50).optional().default('Home'),
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

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number')
    .optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['customer', 'admin', 'agent']).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

const changeRoleSchema = z.object({
  role: z.enum(['customer', 'admin', 'agent']),
});

module.exports = {
  addressSchema,
  updateProfileSchema,
  changePasswordSchema,
  listUsersQuerySchema,
  changeRoleSchema,
};
