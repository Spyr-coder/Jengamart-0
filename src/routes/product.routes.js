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

// Get all products (Customers only see APPROVED, Admins see all)
router.get("/", productController.getProducts);

// Get a single product by ID (Unapproved products are restricted to Admins)
router.get("/:id", productController.getProductById);

// ==========================================
// PROTECTED ROUTES (Requires Logged-In User)
// ==========================================

// Create a new product (Defaults to PENDING, allowed for sellers/customers and admins)
router.post(
  "/",
  protect,
  authorize("admin", "customer"),
  validate(createProductSchema),
  productController.createProduct
);

// Update product details (Resets status to PENDING, allowed for sellers/customers and admins)
router.put(
  "/:id",
  protect,
  authorize("admin", "customer"),
  validate(updateProductSchema),
  productController.updateProduct
);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// Approve or Reject a product status (Expects { "status": "APPROVED" | "REJECTED" | "PENDING" })
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  productController.updateProductStatus
);

// Delete a product permanently
router.delete(
  "/:id",
  protect,
  authorize("admin"),
  productController.deleteProduct
);

module.exports = router;