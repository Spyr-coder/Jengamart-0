const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const validate = require("../middlewares/validate.middleware");
const { flutterwavePaymentSchema } = require("../validators/payment.validator");

router.post(
  "/initiate",
  protect,
  validate(flutterwavePaymentSchema),
  paymentController.initiatePayment
);

router.post("/callback", paymentController.flutterwaveWebhook);

// Optional verification endpoint after redirect if your frontend wants it
router.get("/callback", paymentController.flutterwaveCallback);

router.get("/:id", protect, paymentController.getPayment);

module.exports = router;