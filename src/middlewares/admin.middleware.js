const ApiError = require("../utils/apiError");

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  throw new ApiError(403, "Forbidden: Admin access required");
};

module.exports = adminOnly;