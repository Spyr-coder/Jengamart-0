const Cart = require("../models/cart.model");
const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

exports.getMyCart = asyncHandler(async (req, res) => {
  const cart = Cart.getCart(req.user.id) || [];

  if (cart.length === 0) {
    return res.status(200).json({ success: true, items: [] });
  }

  // Batch query all products in cart using Prisma 'in' filter
  const productIds = cart.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      price: true,
      unit: true,
      stock: true,
      category: true,
    },
  });

  // Map products to quick lookup dictionary
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Enrich cart with product details
  const detailed = cart.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    product: productMap.get(item.productId) || null,
  }));

  res.status(200).json({ success: true, items: detailed });
});

exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) {
    throw new ApiError(400, "productId and quantity are required");
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, "quantity must be a positive number");
  }

  // Fetch product from Prisma
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) throw new ApiError(404, "Product not found");

  // Simple stock protection
  if (qty > product.stock) {
    throw new ApiError(400, "Quantity exceeds available stock");
  }

  const cart = Cart.addItem(req.user.id, productId, qty);

  res.status(200).json({ success: true, cart });
});

exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) {
    throw new ApiError(400, "productId and quantity are required");
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new ApiError(400, "quantity must be a positive number");
  }

  // Fetch product from Prisma
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) throw new ApiError(404, "Product not found");
  if (qty > product.stock) {
    throw new ApiError(400, "Quantity exceeds available stock");
  }

  const cart = Cart.updateItem(req.user.id, productId, qty);
  if (!cart) throw new ApiError(404, "Cart item not found");

  res.status(200).json({ success: true, cart });
});

exports.removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) throw new ApiError(400, "productId is required");

  const cart = Cart.removeItem(req.user.id, productId);
  res.status(200).json({ success: true, cart });
});