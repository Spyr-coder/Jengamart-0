const express = require("express");
const router = express.Router();

const protect = require("../middlewares/auth.middleware");
const orderController = require("../controllers/order.controller");
const validate = require("../middlewares/validate.middleware");
const { createOrderSchema } = require("../validators/order.validator");

router.use(protect);

router.post("/", validate(createOrderSchema), orderController.createOrder);
router.get("/my", orderController.getMyOrders);
router.get("/:id", orderController.getOrderById);

module.exports = router;