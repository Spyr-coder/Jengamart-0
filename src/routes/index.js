const express = require("express");
const router = express.Router();

// Safe import utility to prevent undefined router crashes
const safeRequire = (path) => {
  try {
    const route = require(path);
    if (typeof route === "function" || (route && route.stack)) {
      return route;
    }
    console.warn(`[WARN] Route file ${path} did not export an express.Router()`);
    return null;
  } catch (e) {
    console.warn(`[WARN] Could not load route module ${path}:`, e.message);
    return null;
  }
};

const authRoutes = safeRequire("./auth.routes");
const productRoutes = safeRequire("./product.routes");
const paymentRoutes = safeRequire("./payment.routes");
const adminOrderRoutes = safeRequire("./admin.order.routes");
const aiRoutes = safeRequire("./aiRoutes");
const cartRoutes = safeRequire("./cart.routes");
const orderRoutes = safeRequire("./order.routes");

router.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "FundiMart API running" });
});

if (authRoutes) router.use("/auth", authRoutes);
if (productRoutes) router.use("/products", productRoutes);
if (cartRoutes) router.use("/cart", cartRoutes);
if (orderRoutes) router.use("/orders", orderRoutes);
if (paymentRoutes) router.use("/payments", paymentRoutes);
if (adminOrderRoutes) router.use("/admin/orders", adminOrderRoutes);
if (aiRoutes) router.use("/ai", aiRoutes);

module.exports = router;