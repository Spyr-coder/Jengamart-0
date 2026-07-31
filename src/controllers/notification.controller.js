// controllers/notification.controller.js
const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications
  });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });

  res.status(200).json({
    success: true,
    message: "Notifications marked as read"
  });
});