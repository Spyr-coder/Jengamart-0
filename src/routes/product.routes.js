const express = require("express");
const router = express.Router();

const productController = require("../controllers/product.controller");
const protect = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  createProductSchema,
  updateProductSchema
} = require("../validators/product.validator");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// 1. Get all products catalog
router.get("/", productController.getProducts);

// 2. Get featured hardware material listings (MUST BE PLACED BEFORE /:id)
router.get("/featured", productController.getFeaturedProducts);

// 3. Get single product by ID (Catches dynamic IDs)
router.get("/:id", productController.getProductById);

// ==========================================
// PROTECTED ROUTES (Requires Logged-In User)
// ==========================================

// Create a new product
router.post(
  "/",
  protect,
  authorize("admin", "seller", "customer"),
  validate(createProductSchema),
  productController.createProduct
);

// Update product details
router.put(
  "/:id",
  protect,
  authorize("admin", "seller", "customer"),
  validate(updateProductSchema),
  productController.updateProduct
);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// Approve or Reject product status
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  productController.updateProductStatus
);

// Delete product permanently
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  productController.deleteProduct
);

module.exports = router;