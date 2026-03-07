const express = require("express");
const router = express.Router();

const {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem
} = require("../controllers/cart.controller");

const protect = require("../middlewares/auth.middleware");

// All cart routes require authentication
router.get("/", protect, getMyCart);
router.post("/", protect, addToCart);
router.put("/", protect, updateCartItem);
router.delete("/:productId", protect, removeCartItem);

module.exports = router;

