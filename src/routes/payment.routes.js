const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const validate = require("../middlewares/validate.middleware");
const { flutterwavePaymentSchema } = require("../validators/payment.validator");

// 1. Live M-Pesa STK Push Endpoint (Publicly accessible for checkouts)
router.post("/mpesa/initiate", paymentController.initiatePayment); 

// 2. Original Flutterwave Session Endpoint (Requires authentication & validation)
router.post(
  "/initiate",
  protect,
  validate(flutterwavePaymentSchema),
  paymentController.initiatePayment
);

// 3. Background webhook endpoint (Handles automated Flutterwave server verification alerts)
router.post("/webhook", paymentController.flutterwaveWebhook);

// 4. Frontend browser redirect landing endpoint (Handles user browser navigation return)
router.get("/callback", paymentController.flutterwaveCallback);

// 5. Fetch payment details
router.get("/:id", protect, paymentController.getPayment);

module.exports = router;