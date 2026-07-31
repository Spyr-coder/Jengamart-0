const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

/**
 * @desc    Track marketplace user interaction events (WhatsApp, Calls, Preferred Payments)
 * @route   POST /api/v1/analytics/track
 * @access  Public / Optional Auth
 */
exports.trackClick = asyncHandler(async (req, res) => {
  const { eventType, orderId } = req.body;
  // Capture authenticated user ID if middleware attached `req.user`, otherwise log as guest/null
  const userId = req.user ? req.user.id : null;

  const validEvents = [
    "WHATSAPP_CLICK",
    "CALL_CLICK",
    "PREFERRED_PAYMENT_CLICK"
  ];

  if (!eventType || !validEvents.includes(eventType)) {
    throw new ApiError(
      400,
      `Invalid eventType provided. Allowed types: ${validEvents.join(", ")}`
    );
  }

  // If orderId is provided, verify it exists before linking analytics
  if (orderId) {
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!orderExists) {
      throw new ApiError(404, `Order not found with ID: ${orderId}`);
    }
  }

  const clickEvent = await prisma.clickAnalytics.create({
    data: {
      eventType,
      orderId: orderId || null,
      userId
    }
  });

  res.status(201).json({
    success: true,
    message: "Event logged successfully",
    event: clickEvent
  });
});

/**
 * @desc    Get aggregated analytics metrics for Admin dashboard
 * @route   GET /api/v1/analytics/summary
 * @access  Private (Admin only)
 */
exports.getAnalyticsSummary = asyncHandler(async (req, res) => {
  const totalOrders = await prisma.order.count();
  const completedOrders = await prisma.order.count({
    where: { status: "COMPLETED" }
  });
  const cancelledOrders = await prisma.order.count({
    where: { status: "CANCELLED" }
  });

  const whatsappClicks = await prisma.clickAnalytics.count({
    where: { eventType: "WHATSAPP_CLICK" }
  });

  const callClicks = await prisma.clickAnalytics.count({
    where: { eventType: "CALL_CLICK" }
  });

  const preferredPaymentClicks = await prisma.clickAnalytics.count({
    where: { eventType: "PREFERRED_PAYMENT_CLICK" }
  });

  res.status(200).json({
    success: true,
    metrics: {
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        completionRate: totalOrders > 0 ? `${((completedOrders / totalOrders) * 100).toFixed(1)}%` : "0%"
      },
      engagement: {
        whatsappClicks,
        callClicks,
        preferredPaymentClicks,
        totalContactClicks: whatsappClicks + callClicks
      }
    }
  });
});