const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const orderController = require("../controllers/order.controller");
const validate = require("../middlewares/validate.middleware");
const { createOrderSchema } = require("../validators/order.validator");

// Enforce authentication across all order endpoints
router.use(protect);

// Order creation & lookup routes
router.post("/", validate(createOrderSchema), orderController.createOrder);
router.get("/my", orderController.getMyOrders);
router.get("/:id", orderController.getOrderById);

// Order status lifecycle update route (Submitted -> Accepted -> Preparing -> Delivered -> Completed / Cancelled)
router.patch("/:id/status", orderController.updateOrderStatus);

// Buyer confirms delivery and submits rating/review
router.patch("/:id/complete", orderController.completeOrder);

// Buyer or Seller reports an issue with an order
router.post("/:id/report-issue", orderController.reportOrderIssue);

module.exports = router;