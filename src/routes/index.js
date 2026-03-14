const paymentRoutes = require("./payment.routes");
const adminOrderRoutes = require("./admin.order.routes");
const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const productRoutes = require("./product.routes");

// If you created these later, keep them; if not, comment them out
let cartRoutes, orderRoutes;
try {
  cartRoutes = require("./cart.routes");
} catch (e) {
  cartRoutes = null;
}
try {
  orderRoutes = require("./order.routes");
} catch (e) {
  orderRoutes = null;
}

router.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "FundiMart API running" });
});

// Debug prints (TEMPORARY) — helps confirm exports are correct
console.log("authRoutes type:", typeof authRoutes);
console.log("productRoutes type:", typeof productRoutes);
if (cartRoutes) console.log("cartRoutes type:", typeof cartRoutes);
if (orderRoutes) console.log("orderRoutes type:", typeof orderRoutes);

router.use("/auth", authRoutes);
router.use("/products", productRoutes);

if (cartRoutes) router.use("/cart", cartRoutes);
if (orderRoutes) router.use("/orders", orderRoutes);

router.use("/payments", paymentRoutes);
router.use("/admin/orders", adminOrderRoutes);

module.exports = router;