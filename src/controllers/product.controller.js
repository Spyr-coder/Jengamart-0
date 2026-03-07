const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// Create product (Admin)
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, unit, stock, category, description } = req.body;

  if (!name || price == null || !unit || stock == null) {
    throw new ApiError(400, "Required fields missing");
  }

  const product = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      unit,
      stock: Number(stock),
      category: category || "general",
      description: description || ""
    }
  });

  res.status(201).json({
    success: true,
    product
  });
});

// Get all products
exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive"
    };
  }

  if (category) {
    where.category = {
      equals: category,
      mode: "insensitive"
    };
  }

  const products = await prisma.product.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: {
      createdAt: "desc"
    }
  });

  const total = await prisma.product.count({ where });

  res.status(200).json({
    success: true,
    data: products,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  });
});

// Get single product
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  res.status(200).json({
    success: true,
    product
  });
});

// Update product (Admin)
exports.updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  const { name, price, unit, stock, category, description } = req.body;

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(unit !== undefined && { unit }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(category !== undefined && { category }),
      ...(description !== undefined && { description })
    }
  });

  res.status(200).json({
    success: true,
    product
  });
});

// Delete product (Admin)
exports.deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  await prisma.product.delete({
    where: { id: req.params.id }
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully"
  });
});