const Cart = require("../models/cart.model");
const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

exports.getMyCart = asyncHandler(async (req, res) => {
  const cart = Cart.getCart(req.user.id);

  // Enrich cart with product details (for frontend)
  const detailed = cart.map((item) => {
    const p = Product.findById(item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      product: p
        ? { id: p.id, name: p.name, price: p.price, unit: p.unit, stock: p.stock, category: p.category }
        : null
    };
  });

  res.status(200).json({ success: true, items: detailed });
});

exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) throw new ApiError(400, "productId and quantity are required");
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, "quantity must be a positive number");

  const product = Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");

  // Don’t allow cart qty to exceed stock (simple protection)
  if (qty > product.stock) throw new ApiError(400, "Quantity exceeds available stock");

  const cart = Cart.addItem(req.user.id, productId, qty);

  res.status(200).json({ success: true, cart });
});

exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || quantity == null) throw new ApiError(400, "productId and quantity are required");
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new ApiError(400, "quantity must be a positive number");

  const product = Product.findById(productId);
  if (!product) throw new ApiError(404, "Product not found");
  if (qty > product.stock) throw new ApiError(400, "Quantity exceeds available stock");

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