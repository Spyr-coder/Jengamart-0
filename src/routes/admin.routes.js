const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/admin.middleware");
const adminController = require("../controllers/admin.controller");

// ==========================================
// 1. PUBLIC ADMIN ROUTES (No Token Needed)
// ==========================================
router.post("/login", adminController.adminLogin);

// ==========================================
// 2. PROTECTED ADMIN ROUTES (Token Required)
// ==========================================
// Require authentication & admin role for all routes below this line
router.use(protect, adminOnly);

// Metrics dashboard
router.get("/metrics", adminController.getAdminMetrics);

// Product Moderation
router.get("/products/pending", adminController.getPendingProducts);
router.patch("/products/:id/status", adminController.moderateProduct);

// User Management
router.get("/users", adminController.getAllUsers);

// Category Management
router.post("/categories", adminController.createCategory);
router.get("/categories", adminController.getCategories);
router.delete("/categories/:id", adminController.deleteCategory);

module.exports = router;