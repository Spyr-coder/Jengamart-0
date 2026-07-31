const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// ==========================================
// 0. ADMIN AUTHENTICATION
// ==========================================

// Verify admin key against environment variable and issue JWT
exports.adminLogin = asyncHandler(async (req, res) => {
  const { adminKey } = req.body;

  if (!adminKey) {
    throw new ApiError(400, "Admin key is required");
  }

  const expectedKey = process.env.ADMIN_KEY;

  if (!expectedKey) {
    console.error("❌ ADMIN_KEY environment variable is missing on server.");
    throw new ApiError(500, "Server configuration error: ADMIN_KEY not set");
  }

  if (adminKey.trim() !== expectedKey.trim()) {
    throw new ApiError(401, "Invalid admin key");
  }

  // Issue a signed 8-hour session token
  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET || "default_jwt_secret",
    { expiresIn: "8h" }
  );

  res.status(200).json({
    success: true,
    message: "Admin access granted",
    token
  });
});

// ==========================================
// 1. PRODUCT MODERATION
// ==========================================

// Get all pending products for moderation
exports.getPendingProducts = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { status: "PENDING" },
    include: {
      seller: {
        select: { id: true, name: true, email: true, phoneNumber: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({
    success: true,
    count: products.length,
    products
  });
});

// Moderate product (APPROVED or REJECTED)
exports.moderateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    throw new ApiError(400, "Status must be either APPROVED or REJECTED");
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: { status }
  });

  res.status(200).json({
    success: true,
    message: `Product status updated to ${status}`,
    product: updatedProduct
  });
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

// Get all registered users
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phoneNumber: true,
      whatsappNumber: true,
      county: true,
      town: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({
    success: true,
    count: users.length,
    users
  });
});

// ==========================================
// 3. CATEGORY MANAGEMENT
// ==========================================

// Create new product category
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    throw new ApiError(400, "Category with this name already exists");
  }

  const category = await prisma.category.create({
    data: { name, slug, description }
  });

  res.status(201).json({
    success: true,
    category
  });
});

// Get all categories
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" }
  });

  res.status(200).json({
    success: true,
    count: categories.length,
    categories
  });
});

// Delete category
exports.deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  await prisma.category.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: "Category deleted successfully"
  });
});

// ==========================================
// 4. SYSTEM METRICS / OVERVIEW
// ==========================================

exports.getAdminMetrics = asyncHandler(async (req, res) => {
  const [totalUsers, totalSellers, totalOrders, totalProducts, pendingProducts, reportedIssues] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "seller" } }),
    prisma.order.count(),
    prisma.product.count(),
    prisma.product.count({ where: { status: "PENDING" } }),
    prisma.order.count({ where: { issueReported: true } })
  ]);

  res.status(200).json({
    success: true,
    metrics: {
      totalUsers,
      totalSellers,
      totalOrders,
      totalProducts,
      pendingProducts,
      reportedIssues
    }
  });
});