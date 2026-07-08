const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");

// 1. Core Flexible Endpoint (Publicly accessible to safely handle both Guest & Logged-In checkouts)
router.post("/initiate", paymentController.initiatePayment); 

// 2. Secondary M-Pesa Hook Pathway (Kept mapped for specific service isolation)
router.post("/mpesa/initiate", paymentController.initiatePayment); 

// 3. Background webhook gateway (Handles server-to-server verification alerts)
router.post("/webhook", paymentController.flutterwaveWebhook);

// 4. Frontend browser redirect handler (Manages user landing state responses)
router.get("/callback", paymentController.flutterwaveCallback);

// 5. Secure detail parsing (Strictly requires account verification token)
router.get("/:id", protect, paymentController.getPayment);

module.exports = router;