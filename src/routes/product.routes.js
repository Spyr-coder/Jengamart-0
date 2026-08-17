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

// Optional: If you use multer for file uploads, handle multipart form-data
// If handling URL strings directly, express.json() in app.js handles it.
let upload;
try {
  const multer = require("multer");
  const storage = multer.diskStorage({});
  upload = multer({ storage });
} catch (e) {
  // Multer fallback if not installed
  upload = { array: () => (req, res, next) => next() };
}

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

// Create a new product (handles image array / payload parsing)
router.post(
  "/",
  protect,
  authorize("admin", "seller", "customer"),
  upload.array("photos", 5),
  validate(createProductSchema),
  productController.createProduct
);

// Update product details
router.put(
  "/:id",
  protect,
  authorize("admin", "seller", "customer"),
  upload.array("photos", 5),
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