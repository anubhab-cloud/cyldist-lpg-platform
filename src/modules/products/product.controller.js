'use strict';

const Product = require('./product.model');
const response = require('../../shared/utils/response');
const asyncHandler = require('../../shared/utils/asyncHandler');

const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true });
  return response.success(res, 200, 'Products fetched successfully.', products);
});

module.exports = {
  getProducts,
};
