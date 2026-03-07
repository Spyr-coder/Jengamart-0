const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// Create order with transaction + stock deduction
exports.createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Order must contain at least one item");
  }

  const order = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!item.productId || !quantity || quantity <= 0) {
        throw new ApiError(400, "Each item must have a valid productId and quantity");
      }

      const product = await tx.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }

      if (product.stock < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const lineTotal = product.price * quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        unit: product.unit,
        quantity,
        lineTotal
      });

      // Deduct stock immediately inside transaction
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: {
            decrement: quantity
          }
        }
      });
    }

    const createdOrder = await tx.order.create({
      data: {
        userId,
        subtotal,
        items: {
          create: orderItems
        }
      },
      include: {
        items: true
      }
    });

    return createdOrder;
  });

  res.status(201).json({
    success: true,
    order
  });
});

// Get logged-in user's orders
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
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

// Get single order by ID (owner only for now)
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      payment: true
    }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden");
  }

  res.status(200).json({
    success: true,
    order
  });
});