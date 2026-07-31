const prisma = require("../config/prisma");

/**
 * Creates an in-app notification record for a user
 */
exports.createInAppNotification = async ({ userId, orderId, title, message }) => {
  try {
    if (!userId) return;
    
    await prisma.notification.create({
      data: {
        userId,
        orderId: orderId || null,
        title,
        message
      }
    });
  } catch (error) {
    console.error("Failed to create in-app notification:", error.message);
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
    return;
  }

  // Future phase payment/payout notification logic lives here
};