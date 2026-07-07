const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const validate = require("../middlewares/validate.middleware");
const { flutterwavePaymentSchema } = require("../validators/payment.validator");

// 1. Initiate payment session
router.post(
  "/initiate",
  protect,
  validate(flutterwavePaymentSchema),
  paymentController.initiatePayment
);

// 2. Background webhook endpoint (Handles automated Flutterwave server verification alerts)
router.post("/webhook", paymentController.flutterwaveWebhook);

// 3. Frontend browser redirect landing endpoint (Handles user browser navigation return)
router.get("/callback", paymentController.flutterwaveCallback);

// 4. Fetch payment details
router.get("/:id", protect, paymentController.getPayment);

module.exports = router;