const prisma = require("../config/prisma");

/**
 * Creates an in-app notification record for a user
 */
exports.createInAppNotification = async ({ userId, orderId, title, message }) => {
  try {
    if (!userId) {
      console.warn("⚠️ [Notification Service] Skipped: 'userId' is required.");
      return null;
    }

    // Guard against undefined Prisma model if schema hasn't migrated 'notification'
    if (!prisma.notification) {
      console.warn("⚠️ [Notification Service] Skipped: 'notification' model does not exist on Prisma client.");
      return null;
    }

    const data = {
      userId,
      title: title || "Order Update",
      message: message || "",
    };

    if (orderId) {
      data.orderId = orderId;
    }

    const notification = await prisma.notification.create({ data });
    return notification;
  } catch (error) {
    // Non-blocking error handling to ensure order processing isn't interrupted
    console.error("❌ [Notification Service Error]:", error.message);
    return null;
  }
};

/**
 * Guarded trigger for payment callbacks / payouts
 * Completely bypassed during MVP phase
 */
exports.sendPaymentNotification = async (payload) => {
  const isPaymentEnabled = process.env.ENABLE_PAYMENTS === "true";

  // Completely bypass payment & payout notifications during MVP
  if (!isPaymentEnabled) {
    console.log("ℹ️ Payment notifications bypassed (ENABLE_PAYMENTS=false)");
    return null;
  }

  // Future phase payment/payout notification logic lives here
  return true;
};