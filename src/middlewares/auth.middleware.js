const ApiError = require("../utils/apiError");
const { verifyToken } = require("../utils/jwt");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized");
  }

  let token = authHeader.split(" ")[1];

  // Strip out surrounding double quotes if Swagger UI or a client app includes them literals
  if (token && token.startsWith('"') && token.endsWith('"')) {
    token = token.slice(1, -1);
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
};

module.exports = protect;