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

// Public routes
router.get("/", productController.getProducts);
router.get("/:id", productController.getProductById);

// Admin routes
router.post(
  "/",
  protect,
  authorize("admin"),
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete("/:id", protect, authorize("admin"), productController.deleteProduct);

module.exports = router;