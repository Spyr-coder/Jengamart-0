const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const {
  initiateFlutterwavePayment,
  handleFlutterwaveWebhook,
  confirmFlutterwavePayment,
  getPaymentById
} = require("../services/payment.service");

exports.initiatePayment = asyncHandler(async (req, res) => {
  const { orderId, phone } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden");
  }

  const result = await initiateFlutterwavePayment({
    order,
    user: req.user,
    phone
  });

  res.status(200).json({
    success: true,
    message: "Payment initiated successfully",
    ...result
  });
});

exports.flutterwaveCallback = asyncHandler(async (req, res) => {
  // Optional redirect verification endpoint for frontend/server use.
  // Flutterwave redirects users here/there after checkout, but webhook remains the source of truth.
  const transactionId = req.query.transaction_id;

  if (!transactionId) {
    throw new ApiError(400, "Missing transaction_id");
  }

  const result = await confirmFlutterwavePayment({ transactionId });

  res.status(200).json({
    success: true,
    message: result.success ? "Payment verified successfully" : "Payment verification failed",
    ...result
  });
});

exports.flutterwaveWebhook = asyncHandler(async (req, res) => {
  await handleFlutterwaveWebhook({
    payload: req.body,
    headers: req.headers
  });

  res.status(200).json({
    status: "success"
  });
});

exports.getPayment = asyncHandler(async (req, res) => {
  const payment = await getPaymentById({
    paymentId: req.params.id,
    user: req.user
  });

  res.status(200).json({
    success: true,
    payment
  });
});