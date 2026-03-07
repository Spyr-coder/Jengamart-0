const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// Create product (Admin only)
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, unit, stock, category, description } = req.body;

  if (!name || !price || !unit || stock == null) {
    throw new ApiError(400, "Required fields missing");
  }

  const product = Product.create({
    name,
    price,
    unit,
    stock,
    category,
    description
  });

  res.status(201).json({
    success: true,
    product
  });
});

// Get all products
exports.getProducts = asyncHandler(async (req, res) => {
  const products = Product.findAll();

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// Get single product
exports.getProductById = asyncHandler(async (req, res) => {
  const product = Product.findById(req.params.id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json({
    success: true,
    product
  });
});