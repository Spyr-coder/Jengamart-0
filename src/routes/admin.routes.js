const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/admin.middleware");
const adminController = require("../controllers/admin.controller");

// Middleware to prevent mobile browser API caching on all admin endpoints
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// ==========================================
// 1. PUBLIC ADMIN ROUTES
// ==========================================
router.post("/login", adminController.adminLogin);

// ==========================================
// 2. PROTECTED ADMIN ROUTES (Requires Admin Token)
// ==========================================
router.use(protect, adminOnly);

// Metrics dashboard
router.get("/metrics", adminController.getAdminMetrics);

// Product Moderation & Management
router.get("/products", adminController.getAllProducts);
router.get("/products/pending", adminController.getPendingProducts);
router.patch("/products/:id/status", adminController.moderateProduct);

// User Management
router.get("/users", adminController.getAllUsers);

// Category Management
router.post("/categories", adminController.createCategory);
router.get("/categories", adminController.getCategories);
router.delete("/categories/:id", adminController.deleteCategory);

module.exports = router;