// routes/notification.routes.js
const express = require("express");
const router = express.Router();
const protect = require("../middlewares/auth.middleware");
const notificationController = require("../controllers/notification.controller");

router.use(protect);

router.get("/", notificationController.getMyNotifications);
router.patch("/read", notificationController.markAsRead);

module.exports = router;