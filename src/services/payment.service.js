const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");
const { initiateStkPush } = require("./daraja.service");

const initiateMpesaPayment = async ({ order, userId, phone }) => {
  if (order.status !== "PENDING") {
    throw new ApiError(400, `Order cannot be paid. Current status: ${order.status}`);
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { orderId: order.id }
  });

  if (existingPayment && existingPayment.status === "SUCCESS") {
    throw new ApiError(400, "This order is already paid");
  }

  const payment =
    existingPayment ||
    (await prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        amount: order.subtotal,
        method: "MPESA",
        phone,
        status: "INITIATED"
      }
    }));

  const stkResponse = await initiateStkPush({
    phone,
    amount: order.subtotal,
    accountReference: `Fundimart-${order.id.slice(0, 8)}`,
    transactionDesc: `Payment for order ${order.id.slice(0, 8)}`
  });

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      gatewayReference:
        stkResponse.CheckoutRequestID ||
        stkResponse.MerchantRequestID ||
        payment.gatewayReference
    }
  });

  return {
    paymentId: updatedPayment.id,
    merchantRequestId: stkResponse.MerchantRequestID,
    checkoutRequestId: stkResponse.CheckoutRequestID,
    customerMessage: stkResponse.CustomerMessage,
    responseCode: stkResponse.ResponseCode,
    responseDescription: stkResponse.ResponseDescription
  };
};

const confirmMpesaPayment = async ({
  checkoutRequestId,
  mpesaReceiptNumber,
  resultCode,
  resultDesc
}) => {
  const payment = await prisma.payment.findFirst({
    where: {
      gatewayReference: checkoutRequestId
    }
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found for callback");
  }

  if (String(resultCode) === "0") {
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        receiptNumber: mpesaReceiptNumber || null
      }
    });

    const updatedOrder = await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
      include: {
        items: true,
        payment: true
      }
    });

    return {
      payment: updatedPayment,
      order: updatedOrder,
      success: true,
      resultDesc
    };
  }

  const failedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "FAILED"
    }
  });

  return {
    payment: failedPayment,
    order: null,
    success: false,
    resultDesc
  };
};

module.exports = {
  initiateMpesaPayment,
  confirmMpesaPayment
};