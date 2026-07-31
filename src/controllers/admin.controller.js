const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// ==========================================
// 0. HELPER FUNCTIONS & AUTHENTICATION
// ==========================================

const sanitizeKey = (key) => {
  if (!key) return "";
  return String(key)
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");
};

// Admin login verification and JWT issuance
exports.adminLogin = asyncHandler(async (req, res) => {
  const { adminKey } = req.body;

  if (!adminKey) {
    throw new ApiError(400, "Admin key is required");
  }

  const rawExpectedKey = process.env.ADMIN_KEY;

  if (!rawExpectedKey) {
    console.error("❌ ADMIN_KEY environment variable is missing on server.");
    throw new ApiError(500, "Server configuration error: ADMIN_KEY not set");
  }

  const sanitizedExpected = sanitizeKey(rawExpectedKey);
  const sanitizedInput = sanitizeKey(adminKey);

  if (sanitizedInput !== sanitizedExpected) {
    console.warn(
      `⚠️ Admin Login Failed | Input Len: ${sanitizedInput.length} | Expected Len: ${sanitizedExpected.length}`
    );
    throw new ApiError(401, "Invalid admin key");
  }

  console.log("✅ Admin key verified successfully.");

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
// 1. PRODUCT MODERATION & MANAGEMENT
// ==========================================

// Get ALL products (Approved, Pending, Rejected) for Admin Management Table
exports.getAllProducts = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    include: {
      category: true,
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

// Get pending products for moderation
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

// Moderate product status (APPROVED or REJECTED)
exports.moderateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    throw new ApiError(400, "Status must be APPROVED, REJECTED, or PENDING");
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
// 4. METRICS & ANALYTICS OVERVIEW
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