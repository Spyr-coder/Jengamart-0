const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const paymentController = require("../controllers/payment.controller");
const validate = require("../middlewares/validate.middleware");
const { mpesaPaymentSchema } = require("../validators/payment.validator");

router.post("/mpesa", protect, validate(mpesaPaymentSchema), paymentController.payWithMpesa);
router.post("/mpesa/callback", paymentController.mpesaCallback);

module.exports = router;