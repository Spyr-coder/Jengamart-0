const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const {
  initiateMpesaPayment,
  confirmMpesaPayment
} = require("../services/payment.service");

exports.payWithMpesa = asyncHandler(async (req, res) => {
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

  const result = await initiateMpesaPayment({
    order,
    userId: req.user.id,
    phone
  });

  res.status(200).json({
    success: true,
    message: "STK push sent successfully",
    ...result
  });
});

exports.mpesaCallback = asyncHandler(async (req, res) => {
  const callback = req.body?.Body?.stkCallback;

  if (!callback) {
    throw new ApiError(400, "Invalid M-Pesa callback payload");
  }

  const checkoutRequestId = callback.CheckoutRequestID;
  const resultCode = callback.ResultCode;
  const resultDesc = callback.ResultDesc;

  let mpesaReceiptNumber = null;

  const metadataItems = callback.CallbackMetadata?.Item || [];
  for (const item of metadataItems) {
    if (item.Name === "MpesaReceiptNumber") {
      mpesaReceiptNumber = item.Value;
    }
  }

  const result = await confirmMpesaPayment({
    checkoutRequestId,
    mpesaReceiptNumber,
    resultCode,
    resultDesc
  });

  res.status(200).json({
    ResultCode: 0,
    ResultDesc: "Accepted",
    paymentProcessed: result.success
  });
});