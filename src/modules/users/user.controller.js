'use strict';

const userService = require('./user.service');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and address management
 */

// --- Own profile ---
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.getProfile(req.user.id);
  return response.success(res, 200, 'Profile fetched.', user);
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body);
  return response.success(res, 200, 'Profile updated.', user);
});

const changeMyPassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);
  return response.success(res, 200, 'Password changed successfully.');
});

const addMyAddress = asyncHandler(async (req, res) => {
  const user = await userService.addAddress(req.user.id, req.body);
  return response.success(res, 201, 'Address added.', user);
});

const removeMyAddress = asyncHandler(async (req, res) => {
  const user = await userService.removeAddress(req.user.id, req.params.addressId);
  return response.success(res, 200, 'Address removed.', user);
});

const addWalletFunds = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const user = await userService.addWalletFunds(req.user.id, Number(amount));
  return response.success(res, 200, 'Funds added successfully.', user);
});

const submitKyc = asyncHandler(async (req, res) => {
  let documentImageUrl = '';
  if (req.file) {
    documentImageUrl = req.file.location || `/uploads/${req.file.filename}`;
  } else {
    return response.error(res, 400, 'Document image is required.');
  }

  const payload = { ...req.body, documentImageUrl };
  const user = await userService.submitKyc(req.user.id, payload);
  return response.success(res, 200, 'KYC submitted successfully.', user);
});

// --- Agent duty status ---
const updateDutyStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateAgentDutyStatus(req.user.id, req.body.isOnDuty);
  return response.success(res, 200, `Duty status updated to ${req.body.isOnDuty ? 'on duty' : 'off duty'}.`, user);
});

// --- Admin operations ---
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, isActive } = req.query;
  const { users, total } = await userService.listUsers({ page, limit, role, isActive });
  return response.success(
    res,
    200,
    'Users fetched.',
    users,
    response.paginate(total, page || 1, limit || 20)
  );
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  return response.success(res, 200, 'User fetched.', user);
});

const changeUserRole = asyncHandler(async (req, res) => {
  const user = await userService.changeRole(req.params.id, req.body.role);
  return response.success(res, 200, `User role updated to ${req.body.role}.`, user);
});

const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await userService.toggleActive(req.params.id, req.body.isActive);
  return response.success(res, 200, 'User active status updated.', user);
});

const listPendingKyc = asyncHandler(async (req, res) => {
  const result = await userService.listPendingKyc(req.query);
  return response.success(res, 200, 'Pending KYC requests fetched successfully.', result);
});

const updateKycStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateKycStatus(req.params.id, req.body);
  
  // Notify the user in real-time that their KYC status changed
  const io = req.app.get('io');
  if (io) {
    io.to(`user:${user._id.toString()}`).emit('user:updated', user);
  }
  
  return response.success(res, 200, 'KYC status updated.', user);
});

const getAvailableAgents = asyncHandler(async (req, res) => {
  const agents = await userService.getAvailableAgents();
  return response.success(res, 200, 'Available agents fetched.', agents);
});

const getAgentsPerformance = asyncHandler(async (req, res) => {
  const performance = await userService.getAgentsPerformance();
  return response.success(res, 200, 'Agents performance analytics fetched.', performance);
});

module.exports = {
  getMyProfile, updateMyProfile, changeMyPassword,
  addMyAddress, removeMyAddress, addWalletFunds, submitKyc, updateDutyStatus,
  listUsers, getUserById, changeUserRole, toggleUserActive, getAvailableAgents,
  listPendingKyc, updateKycStatus, getAgentsPerformance,
};
