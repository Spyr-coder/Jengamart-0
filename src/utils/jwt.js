const jwt = require("jsonwebtoken");

// Fallback prevents server crashes if process.env.JWT_SECRET is missing on Render
const JWT_SECRET = process.env.JWT_SECRET || "843e426d5135d62adbe252b7e365ff9f";

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d"
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};