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

  // 1. Defensively catch missing strings or spacebar injections before array evaluations
  if (!county || !county.trim() || !town || !town.trim()) {
    throw new ApiError(400, "Delivery County and Town/Area are required fields.");
  }

  const cleanCounty = county.trim();
  const cleanTown = town.trim();

  // 2. Server-Side Location Cross-Verification
  const validTowns = kenyanLocations[cleanCounty];
  if (!validTowns) {
    throw new ApiError(400, `Invalid County selected: '${cleanCounty}'. Please select a valid option.`);
  }

  if (!validTowns.includes(cleanTown)) {
    throw new ApiError(400, `The location '${cleanTown}' does not belong to ${cleanCounty} County.`);
  }

  // 3. Quick Checkout Flow: Handle Direct-from-Cart operations safely (Supports Guests)
  if (!orderId && amount) {
    console.log(`Processing direct quick-checkout for amount: ${amount} | Phone: ${phone} | Location: ${cleanTown}, ${cleanCounty}`);
    
    // Safely evaluate authentication contexts without interrupting guest requests
    let customerUser = { id: "guest", firstName: "Guest", lastName: "Buyer", email: "guest@fundimart.com" };
    
    if (req.user && req.user.id) {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (dbUser) customerUser = dbUser;
    }

    return res.status(200).json({
      success: true,
      message: "Payment request received successfully at Fundimart backend Gateway!",
      data: {
        phone,
        amount,
        county: cleanCounty,
        town: cleanTown,
        metadata,
        customer: customerUser
      }
    });
  }

  // 4. Standard Flow: Handle explicit pre-existing order lookups (Requires Authentication)
  if (!orderId) {
    throw new ApiError(400, "Missing orderId parameter for standard verification flow");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) {
    throw new ApiError(404, "Order records not found within our system.");
  }

  if (!req.user) {
    throw new ApiError(401, "Authentication required for standard order checkouts");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Access denied. You do not own the requested order record.");
  }

  // Update order destination parameters securely before invoking external services
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { county: cleanCounty, town: cleanTown }
  });

  // Fetch complete profile records to guarantee delivery details exist
  const fullUser = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!fullUser) {
    throw new ApiError(404, "User profile record not found.");
  }

  // Pass complete user profile metrics into active service integrations
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
    throw new ApiError(400, "Missing transaction_id query parameters.");
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
    throw new ApiError(401, "Authentication required to fetch payment info.");
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