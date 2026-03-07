const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const authorize = require("../middlewares/role.middleware");
const adminOrderController = require("../controllers/admin.order.controller");

router.use(protect);
router.use(authorize("admin"));

router.get("/orders", adminOrderController.getAllOrders);
router.put("/orders/:id/status", adminOrderController.updateOrderStatus);

module.exports = router;