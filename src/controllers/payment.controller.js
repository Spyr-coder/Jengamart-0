const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const {
  initiateFlutterwavePayment,
  handleFlutterwaveWebhook,
  confirmFlutterwavePayment,
  getPaymentById
} = require("../services/payment.service");

// Embedded localized dataset for rigorous cross-verification
const kenyanLocations = {
  "Nairobi": ["Westlands", "CBD", "Ruiru Bypass", "Lang'ata", "Kasarani"],
  "Kisumu": ["Kisumu Central", "Milimani", "Kondele", "Kibos", "Riat"],
  "Mombasa": ["Nyali", "Changamwe", "Mtwapa", "Kisauni", "Likoni"],
  "Uasin Gishu": ["Eldoret CBD", "Kapsoya", "Langas", "Pioneer"]
};

exports.initiatePayment = asyncHandler(async (req, res) => {
  const { orderId, phone, amount, county, town, metadata } = req.body;

  // 1. Server-Side Location Cross-Verification
  const validTowns = kenyanLocations[county];
  if (!validTowns) {
    throw new ApiError(400, `Invalid County selected: '${county}'. Please select a valid option.`);
  }

  if (!validTowns.includes(town)) {
    throw new ApiError(400, `The location '${town}' does not belong to ${county} County.`);
  }

  // 2. Detect if this is a Quick Checkout (Direct from Cart) or an explicit Order-based checkout
  if (!orderId && amount) {
    console.log(`Processing direct quick-checkout for amount: ${amount} | Phone: ${phone} | Location: ${town}, ${county}`);
    
    // Create a fallback guest user object if no auth token is attached
    const guestUser = req.user ? 
      await prisma.user.findUnique({ where: { id: req.user.id } }) : 
      { id: "guest", firstName: "Guest", lastName: "Buyer", email: "guest@fundimart.com" };

    return res.status(200).json({
      success: true,
      message: "Payment request received successfully at Fundimart backend Gateway!",
      data: {
        phone,
        amount,
        county,
        town,
        metadata,
        customer: guestUser
      }
    });
  }

  // 3. Standard Flow: Handle Explicit pre-existing orders
  if (!orderId) {
    throw new ApiError(400, "Missing orderId for standard verification flow");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!req.user) {
    throw new ApiError(401, "Authentication required for standard order checkouts");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden");
  }

  // Update order destination parameters securely before hitting gateways
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { county, town }
  });

  // Fetch the complete user from the DB to guarantee email and name exist
  const fullUser = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!fullUser) {
    throw new ApiError(404, "User profile not found");
  }

  // Pass the database-backed user object containing email and name
  const result = await initiateFlutterwavePayment({
    order: updatedOrder,
    user: fullUser,
    phone
  });

  res.status(200).json({
    success: true,
    message: "Payment initiated successfully",
    ...result
  });
});

exports.flutterwaveCallback = asyncHandler(async (req, res) => {
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
  if (!req.user) {
    throw new ApiError(401, "Authentication required to fetch payment info");
  }

  const payment = await getPaymentById({
    paymentId: req.params.id,
    user: req.user
  });

  res.status(200).json({
    success: true,
    payment
  });
});