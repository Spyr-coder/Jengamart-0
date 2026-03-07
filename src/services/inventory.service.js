const ApiError = require("../utils/apiError");
const Product = require("../models/product.model");

// Check stock for cart items
const validateStock = (cartItems) => {
  for (const item of cartItems) {
    const product = Product.findById(item.productId);
    if (!product) throw new ApiError(404, `Product not found: ${item.productId}`);
    if (item.quantity <= 0) throw new ApiError(400, "Quantity must be greater than 0");
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }
  }
};

// Deduct stock after order creation
const deductStock = (cartItems) => {
  for (const item of cartItems) {
    const product = Product.findById(item.productId);
    product.stock -= item.quantity;
  }
};

module.exports = {
  validateStock,
  deductStock
};