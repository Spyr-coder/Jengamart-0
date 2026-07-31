/**
 * Middleware to toggle features on/off based on environment flags
 */
exports.requirePaymentFeature = (req, res, next) => {
  const isPaymentEnabled = process.env.ENABLE_PAYMENTS === "true";

  if (!isPaymentEnabled) {
    return res.status(403).json({
      success: false,
      message: "Direct payment features are currently disabled for this MVP phase. Please use direct order contact flow."
    });
  }

  next();
};