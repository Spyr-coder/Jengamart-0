const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// Get all orders
exports.getAllOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      items: true,
      payment: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  res.status(200).json({
    success: true,
    count: orders.length,
    orders
  });
});

// Update order status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];

  if (!status || !allowedStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Allowed: ${allowedStatuses.join(", ")}`);
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id }
  });

  if (!existingOrder) {
    throw new ApiError(404, "Order not found");
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: true,
      payment: true
    }
  });

  res.status(200).json({
    success: true,
    order
  });
});