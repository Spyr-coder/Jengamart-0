const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const analyticsController = require("../controllers/analytics.controller");

/**
 * @route   POST /api/v1/analytics/track
 * @desc    Log click events (WhatsApp, Call, Preferred Payment clicks)
 * @access  Public / Optional Auth (Tracks guest buyers or logged-in users)
 */
router.post(
  "/track",
  (req, res, next) => {
    // If the request carries a Bearer token, decode the user first
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      return protect(req, res, next);
    }
    next();
  },
  analyticsController.trackClick
);

/**
 * @route   GET /api/v1/analytics/summary
 * @desc    Get aggregated marketplace conversion metrics for Admin Dashboard
 * @access  Private (Admin)
 */
router.get(
  "/summary",
  protect,
  analyticsController.getAnalyticsSummary
);

module.exports = router;