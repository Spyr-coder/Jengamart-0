const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const notificationService = require("../services/notification.service");

// Helper function to safely send notifications without throwing fatal server errors
const safeSendNotification = async (payload) => {
  try {
    if (notificationService && typeof notificationService.createInAppNotification === "function") {
      await notificationService.createInAppNotification(payload);
    } else {
      console.warn("[WARN] notificationService.createInAppNotification is not defined.");
    }
  } catch (error) {
    console.error("[ERROR] Failed to dispatch notification:", error.message);
  }
};

// Create order with transaction, stock deduction, and contact reveal
exports.createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { items, county, town, deliveryAddress, preferredPaymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Order must contain at least one item");
  }

  if (!county || !town) {
    throw new ApiError(400, "County and town are required for order delivery");
  }

  const { createdOrder, seller } = await prisma.$transaction(async (tx) => {
    let subtotal = 0;
    const orderItems = [];
    let detectedSeller = null;

    for (const item of items) {
      const quantity = Number(item.quantity);

      if (!item.productId || !quantity || quantity <= 0) {
        throw new ApiError(400, "Each item must have a valid productId and quantity");
      }

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { seller: true }
      });

      if (!product) {
        throw new ApiError(404, `Product not found: ${item.productId}`);
      }

      if (product.stock < quantity) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      // Capture the seller for contact reveal (if linked)
      if (product.seller && !detectedSeller) {
        detectedSeller = product.seller;
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

    const newOrder = await tx.order.create({
      data: {
        userId,
        sellerId: detectedSeller ? detectedSeller.id : null,
        subtotal,
        county,
        town,
        deliveryAddress: deliveryAddress || "",
        preferredPaymentMethod: preferredPaymentMethod || "Direct Payment",
        status: "SUBMITTED",
        items: {
          create: orderItems
        }
      },
      include: {
        items: true,
        seller: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            whatsappNumber: true
          }
        }
      }
    });

    return { createdOrder: newOrder, seller: detectedSeller };
  });

  // Construct WhatsApp Deep Link for immediate contact reveal
  let sellerContact = null;
  if (seller) {
    const contactPhone = seller.whatsappNumber || seller.phoneNumber;
    const whatsappMsg = encodeURIComponent(
      `Hello ${seller.name}, I have placed Order #${createdOrder.orderNumber || createdOrder.id} on Fundimart for KES ${createdOrder.subtotal}. Let's arrange payment and delivery.`
    );

    sellerContact = {
      name: seller.name,
      phoneNumber: seller.phoneNumber,
      whatsappNumber: seller.whatsappNumber,
      whatsappUrl: contactPhone ? `https://wa.me/${contactPhone.replace(/[^0-9]/g, "")}?text=${whatsappMsg}` : null
    };

    // Safe Notification Call
    await safeSendNotification({
      userId: seller.id,
      orderId: createdOrder.id,
      title: "New Incoming Order",
      message: `You have received a new order (#${createdOrder.orderNumber || createdOrder.id}) for KES ${createdOrder.subtotal}.`
    });
  }

  res.status(201).json({
    success: true,
    order: createdOrder,
    sellerContact
  });
});

// Get logged-in user's orders (Handles both Customer and Seller views)
exports.getMyOrders = asyncHandler(async (req, res) => {
  const isSeller = req.user.role === "seller";

  const orders = await prisma.order.findMany({
    where: isSeller ? { sellerId: req.user.id } : { userId: req.user.id },
    include: {
      items: true,
      user: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          whatsappNumber: true
        }
      },
      seller: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          whatsappNumber: true
        }
      },
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

// Get single order by ID (Accessible by Buyer, Seller, or Admin)
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      user: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          whatsappNumber: true
        }
      },
      seller: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          whatsappNumber: true
        }
      },
      payment: true
    }
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const isBuyer = order.userId === req.user.id;
  const isSeller = order.sellerId === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isBuyer && !isSeller && !isAdmin) {
    throw new ApiError(403, "Forbidden: You do not have access to view this order");
  }

  res.status(200).json({
    success: true,
    order
  });
});

// Update Order Status & Restore Stock if CANCELLED
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  const validStatuses = [
    "SUBMITTED",
    "ACCEPTED",
    "PREPARING",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "PENDING",
    "PAID",
    "SHIPPED"
  ];

  if (!status || !validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid or missing order status");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!existingOrder) {
    throw new ApiError(404, "Order not found");
  }

  // Handle stock restoration if order gets CANCELLED from an active state
  const isCancelling = status === "CANCELLED" && existingOrder.status !== "CANCELLED";

  const updatedOrder = await prisma.$transaction(async (tx) => {
    if (isCancelling) {
      for (const item of existingOrder.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } }
          });
        }
      }
    }

    return await tx.order.update({
      where: { id },
      data: {
        status,
        cancellationReason: status === "CANCELLED" ? cancellationReason : undefined
      },
      include: { items: true }
    });
  });

  // Safe notification message generation
  let title = "Order Status Updated";
  let message = `Your Order #${updatedOrder.orderNumber || updatedOrder.id} is now ${status}.`;

  if (status === "ACCEPTED") {
    message = `The seller has accepted your order! Check contact details to arrange payment and delivery directly.`;
  } else if (status === "CANCELLED") {
    message = `Your order was cancelled. Reason: ${cancellationReason || "Not specified"}. Stock has been restored.`;
  } else if (status === "DELIVERED") {
    message = `Your order has been marked as delivered by the seller. Please confirm completion on your dashboard.`;
  }

  await safeSendNotification({
    userId: updatedOrder.userId,
    orderId: updatedOrder.id,
    title,
    message
  });

  res.status(200).json({
    success: true,
    message: `Order status updated to ${status}`,
    order: updatedOrder
  });
});

// Buyer confirms delivery and optionally rates the seller/order
exports.completeOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, reviewComment } = req.body;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Only the buyer who placed this order can confirm completion");
  }

  if (rating && (rating < 1 || rating > 5)) {
    throw new ApiError(400, "Rating must be an integer between 1 and 5");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "COMPLETED",
      rating: rating ? Number(rating) : undefined,
      reviewComment: reviewComment || undefined
    }
  });

  if (order.sellerId) {
    await safeSendNotification({
      userId: order.sellerId,
      orderId: order.id,
      title: "Order Completed",
      message: `Buyer has confirmed delivery for Order #${order.orderNumber || order.id}.${rating ? ` Rating: ${rating}/5 ⭐` : ""}`
    });
  }

  res.status(200).json({
    success: true,
    message: "Order marked as completed",
    order: updatedOrder
  });
});

// Buyer or Seller reports an issue with an order
exports.reportOrderIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { issueReason } = req.body;

  if (!issueReason) {
    throw new ApiError(400, "Please provide a reason for reporting the issue");
  }

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  const isBuyer = order.userId === req.user.id;
  const isSeller = order.sellerId === req.user.id;

  if (!isBuyer && !isSeller) {
    throw new ApiError(403, "You are not authorized to report an issue for this order");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      issueReported: true,
      issueReason
    }
  });

  const recipientId = isBuyer ? order.sellerId : order.userId;
  if (recipientId) {
    await safeSendNotification({
      userId: recipientId,
      orderId: order.id,
      title: "Issue Reported on Order",
      message: `An issue was reported on Order #${order.orderNumber || order.id}: "${issueReason}"`
    });
  }

  res.status(200).json({
    success: true,
    message: "Issue reported successfully. Support team notified.",
    order: updatedOrder
  });
});