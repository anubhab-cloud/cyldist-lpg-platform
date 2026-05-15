'use strict';

const supportService = require('./support.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Customer support and complaints management
 */

const createComplaint = asyncHandler(async (req, res) => {
  const result = await supportService.createComplaint(req.body, req.user.id);
  return response.success(res, 201, 'Complaint submitted successfully.', result);
});

const getComplaints = asyncHandler(async (req, res) => {
  const result = await supportService.getComplaints(req.query, req.user);
  return response.success(res, 200, 'Complaints retrieved successfully.', result);
});

const getComplaintById = asyncHandler(async (req, res) => {
  const result = await supportService.getComplaintById(req.params.id, req.user);
  return response.success(res, 200, 'Complaint retrieved successfully.', result);
});

const updateComplaint = asyncHandler(async (req, res) => {
  const result = await supportService.updateComplaint(req.params.id, req.body);
  return response.success(res, 200, 'Complaint updated successfully.', result);
});

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
};
