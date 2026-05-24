'use strict';

const Coupon = require('./coupon.model');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

const getActiveCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({ isActive: true });
  return response.success(res, 200, 'Coupons fetched successfully.', coupons);
});

module.exports = {
  getActiveCoupons,
};
