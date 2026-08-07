const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// Create product (Defaults to PENDING status and links to authenticated seller)
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, unit, stock, category, description } = req.body;

  if (!name || price == null || !unit || stock == null) {
    throw new ApiError(400, "Required fields missing");
  }

  // Extract authenticated seller ID from req.user
  const sellerId = req.user ? req.user.id : null;

  const product = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      unit,
      stock: Number(stock),
      category: category || "general",
      description: description || "",
      status: "PENDING",
      sellerId
    }
  });

  res.status(201).json({
    success: true,
    product
  });
});

// Get all products (Filters so customers only see APPROVED listings by default)
exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, status, page = 1, limit = 10 } = req.query;

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

  // If status parameter is explicitly requested, respect it; otherwise filter accordingly
  if (status) {
    where.status = status;
  } else if (!req.user || req.user.role !== "admin") {
    // Non-admin requests default strictly to APPROVED
    where.status = "APPROVED";
  }

  const products = await prisma.product.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: {
      createdAt: "desc"
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true
        }
      }
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

// Get single product (Prevents unapproved direct link traversal by public users)
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true
        }
      }
    }
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Prevent customer access if product is not approved
  if (product.status !== "APPROVED") {
    const isAdmin = req.user && req.user.role === "admin";
    const isOwner = req.user && req.user.id === product.sellerId;
    if (!isAdmin && !isOwner) {
      throw new ApiError(403, "This product is pending administrative approval");
    }
  }

  res.status(200).json({
    success: true,
    product
  });
});

// Update product details (Resets status back to PENDING for review)
exports.updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  // Check ownership unless admin
  if (req.user && req.user.role !== "admin" && existing.sellerId !== req.user.id) {
    throw new ApiError(403, "You do not have permission to update this product");
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
      ...(description !== undefined && { description }),
      status: "PENDING" // Reset to PENDING so modified listings are checked again
    }
  });

  res.status(200).json({
    success: true,
    product
  });
});

// Update product status (Admin Only - Approve/Reject)
exports.updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be APPROVED, REJECTED, or PENDING");
  }

  const existing = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  const updatedProduct = await prisma.product.update({
    where: { id: req.params.id },
    data: { status }
  });

  res.status(200).json({
    success: true,
    message: `Product status successfully updated to ${status}`,
    product: updatedProduct
  });
});

// Delete product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  // Allow deletion if admin or item owner
  if (req.user && req.user.role !== "admin" && existing.sellerId !== req.user.id) {
    throw new ApiError(403, "You do not have permission to delete this product");
  }

  await prisma.product.delete({
    where: { id: req.params.id }
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully"
  });
});