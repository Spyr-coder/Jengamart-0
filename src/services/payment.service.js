const axios = require("axios");
const prisma = require("../config/prisma");
const ApiError = require("../utils/apiError");

const FLW_BASE_URL = "https://api.flutterwave.com/v3";
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH || process.env.FLW_SECRET_KEY_HASH;

const flutterwave = axios.create({
  baseURL: FLW_BASE_URL,
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${FLW_SECRET_KEY}`,
    "Content-Type": "application/json"
  }
});

const normalizePhone = (phone) => {
  if (!phone) return null;

  let p = String(phone).trim().replace(/\s+/g, "");

  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = `254${p.slice(1)}`;

  if (!/^254\d{9}$/.test(p)) {
    throw new ApiError(400, "Invalid phone number format");
  }

  return p;
};

const buildTxRef = (orderId) => {
  return `FUNDIMART-${orderId}-${Date.now()}`;
};

const initiateFlutterwavePayment = async ({ order, user, phone }) => {
  if (order.status !== "PENDING") {
    throw new ApiError(400, `Order cannot be paid. Current status: ${order.status}`);
  }

  const existingPayment = await prisma.payment.findUnique({
    where: { orderId: order.id }
  });

  if (existingPayment && existingPayment.status === "SUCCESS") {
    throw new ApiError(400, "This order is already paid");
  }

  const normalizedPhone = normalizePhone(phone);
  const txRef = existingPayment?.gatewayReference || buildTxRef(order.id);

  const payment =
    existingPayment ||
    (await prisma.payment.create({
      data: {
        orderId: order.id,
        userId: user.id,
        amount: order.subtotal,
        method: "FLUTTERWAVE",
        phone: normalizedPhone,
        status: "INITIATED",
        gatewayReference: txRef
      }
    }));

  try {
    const payload = {
      tx_ref: txRef,
      amount: order.subtotal,
      currency: "KES",
      redirect_url: `${process.env.FRONTEND_URL.replace(/\/$/, "")}/payment/callback`,
      customer: {
        email: user.email,
        name: user.name,
        phonenumber: normalizedPhone
      },
      customizations: {
        title: "Fundimart",
        description: `Payment for order ${order.id.slice(0, 8)}`,
        logo: `${process.env.FRONTEND_URL.replace(/\/$/, "")}/logo.png`
      },
      meta: {
        orderId: order.id,
        userId: user.id
      }
      // Optional:
      // payment_options: "card,mobilemoney"
    };

    const response = await flutterwave.post("/payments", payload);
    const flw = response.data;

    if (flw.status !== "success" || !flw.data?.link) {
      throw new ApiError(502, "Unable to initiate Flutterwave payment");
    }

    return {
      paymentId: payment.id,
      txRef,
      paymentLink: flw.data.link,
      flutterwaveResponse: flw
    };
  } catch (error) {
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || error.message || "Flutterwave initiation failed"
    );
  }
};

const verifyFlutterwaveTransaction = async ({ transactionId }) => {
  if (!transactionId) {
    throw new ApiError(400, "Transaction ID is required for verification");
  }

  try {
    const response = await flutterwave.get(`/transactions/${transactionId}/verify`);
    return response.data;
  } catch (error) {
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || "Failed to verify Flutterwave transaction"
    );
  }
};

const confirmFlutterwavePayment = async ({ transactionId }) => {
  const verification = await verifyFlutterwaveTransaction({ transactionId });

  const tx = verification?.data;

  if (!tx) {
    throw new ApiError(400, "Invalid verification response from Flutterwave");
  }

  const txRef = tx.tx_ref;
  const status = tx.status;
  const amount = Number(tx.amount);
  const currency = tx.currency;
  const receiptNumber = tx.flw_ref || String(tx.id);

  const payment = await prisma.payment.findFirst({
    where: { gatewayReference: txRef },
    include: { order: true }
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found for verified transaction");
  }

  if (payment.status === "SUCCESS") {
    return {
      success: true,
      alreadyProcessed: true,
      payment,
      order: payment.order
    };
  }

  const expectedAmount = Number(payment.amount);
  const expectedCurrency = "KES";

  const isSuccessful =
    status === "successful" &&
    currency === expectedCurrency &&
    amount >= expectedAmount;

  const result = await prisma.$transaction(async (txPrisma) => {
    const updatedPayment = await txPrisma.payment.update({
      where: { id: payment.id },
      data: {
        status: isSuccessful ? "SUCCESS" : "FAILED",
        receiptNumber
      }
    });

    const updatedOrder = await txPrisma.order.update({
      where: { id: payment.orderId },
      data: {
        status: isSuccessful ? "PAID" : "PENDING"
      },
      include: {
        items: true,
        payment: true
      }
    });

    return {
      payment: updatedPayment,
      order: updatedOrder,
      success: isSuccessful,
      verification
    };
  });

  return result;
};

const handleFlutterwaveWebhook = async ({ payload, headers }) => {
  const signature = headers["verif-hash"];
  if (!signature || signature !== FLW_SECRET_HASH) {
    throw new ApiError(401, "Invalid Flutterwave webhook signature");
  }

  const event = payload?.event;
  const data = payload?.data;

  if (!data?.id) {
    throw new ApiError(400, "Invalid Flutterwave webhook payload");
  }

  // Only process successful charge-like events meaningfully.
  // Even then, always verify with Flutterwave before updating the order.
  if (event && String(event).toLowerCase().includes("charge")) {
    return await confirmFlutterwavePayment({ transactionId: data.id });
  }

  // For any other event, acknowledge without failing the webhook flow.
  return {
    success: true,
    ignored: true,
    event
  };
};

const getPaymentById = async ({ paymentId, user }) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        include: {
          items: true
        }
      }
    }
  });

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (user.role !== "admin" && payment.userId !== user.id) {
    throw new ApiError(403, "Forbidden");
  }

  return payment;
};

module.exports = {
  initiateFlutterwavePayment,
  confirmFlutterwavePayment,
  handleFlutterwaveWebhook,
  verifyFlutterwaveTransaction,
  getPaymentById
};