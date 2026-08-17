const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

// Helper function to extract and normalize image URLs safely
const extractImages = (product) => {
  // 1. Check direct database fields (`photos` or `image`)
  if (Array.isArray(product.photos) && product.photos.length > 0) {
    return product.photos;
  }
  if (product.image && typeof product.image === "string" && product.image.trim() !== "") {
    return [product.image];
  }

  // 2. Fallback to `images` property if attached to object
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images;
  }

  // 3. Fallback: Parse from stringified array
  if (typeof product.photos === "string" && product.photos.trim() !== "") {
    try {
      const parsed = JSON.parse(product.photos);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return [product.photos];
    }
  }

  // 4. Fallback: Parse from serialized metadata inside description for legacy data
  if (product.description && product.description.includes("__IMAGES__:")) {
    try {
      const parts = product.description.split("__IMAGES__:");
      const parsed = JSON.parse(parts[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback if parsing fails
    }
  }

  return [];
};

// Helper function to format outgoing product object for frontend compatibility
const formatProductResponse = (product) => {
  const images = extractImages(product);
  const cleanDescription = product.description
    ? product.description.split("__IMAGES__:")[0].trim()
    : "";

  return {
    ...product,
    description: cleanDescription,
    images: images,
    photos: images,
    image: images[0] || product.image || null,
  };
};

// Create product (Defaults status and links to authenticated seller)
exports.createProduct = asyncHandler(async (req, res) => {
  const { name, price, unit, stock, category, description, images, photos, image, status } = req.body;
  if (!name || price == null || !unit || stock == null) {
    throw new ApiError(400, "Required fields missing");
  }

  // Extract authenticated seller ID from req.user
  const sellerId = req.user ? req.user.id : null;

  // Combine image URLs from req.files (Multer upload), req.body.photos, req.body.images, or req.body.image
  let normalizedImages = [];

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    normalizedImages = req.files.map((file) => file.path || file.location || `/uploads/${file.filename}`);
  } else {
    const inputImages = photos || images || (image ? [image] : []);
    normalizedImages = Array.isArray(inputImages)
      ? inputImages
      : typeof inputImages === "string"
      ? [inputImages]
      : [];
  }

  let finalDescription = description || "";

  // Set default status. Admins can pass status directly; sellers default to APPROVED (or PENDING if moderation is enabled)
  const initialStatus = status || "APPROVED";

  const product = await prisma.product.create({
    data: {
      name,
      price: Number(price),
      unit,
      stock: Number(stock),
      category: category || "general",
      description: finalDescription,
      photos: normalizedImages,
      image: normalizedImages[0] || null,
      status: initialStatus,
      sellerId,
    },
  });

  res.status(201).json({
    success: true,
    product: formatProductResponse(product),
  });
});

// Get all products (Filters so customers only see APPROVED listings by default unless status=ALL or admin)
exports.getProducts = asyncHandler(async (req, res) => {
  const { search, category, status, page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }

  if (category) {
    where.category = {
      equals: category,
      mode: "insensitive",
    };
  }

  // Handle status filter
  if (status === "ALL" || (!status && req.user && req.user.role === "admin")) {
    // Return all statuses without adding where.status filter
  } else if (status) {
    where.status = status;
  } else if (!req.user || req.user.role !== "admin") {
    // Non-admin public catalog defaults strictly to APPROVED
    where.status = "APPROVED";
  }

  const products = await prisma.product.findMany({
    where,
    skip,
    take: Number(limit),
    orderBy: {
      createdAt: "desc",
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
  });

  const formattedProducts = products.map(formatProductResponse);
  const total = await prisma.product.count({ where });

  res.status(200).json({
    success: true,
    data: formattedProducts,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
});

// Get featured products for homepage
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 12;

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
    },
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
  });

  const formattedProducts = products.map(formatProductResponse);

  res.status(200).json({
    success: true,
    data: formattedProducts,
  });
});

// Get single product (Prevents unapproved direct link traversal by public users)
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          whatsappNumber: true,
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Prevent customer access if product is not approved
  if (product.status !== "APPROVED") {
    const isAdmin = req.user && req.user.role === "admin";
    const isOwner = req.user && req.user.id === product.sellerId;
    if (!isAdmin && !isOwner) {
      throw new ApiError(403, "This product is pending administrative approval");
    }
  }

  res.status(200).json({
    success: true,
    product: formatProductResponse(product),
  });
});

// Update product details
exports.updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  // Check ownership unless admin
  if (req.user && req.user.role !== "admin" && existing.sellerId !== req.user.id) {
    throw new ApiError(403, "You do not have permission to update this product");
  }

  const { name, price, unit, stock, category, description, images, photos, image, status } = req.body;

  let updatedDescription = description !== undefined ? description : existing.description.split("__IMAGES__:")[0].trim();
  
  let normalizedImages = existing.photos || [];

  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    normalizedImages = req.files.map((file) => file.path || file.location || `/uploads/${file.filename}`);
  } else {
    const inputImages = photos || images || (image ? [image] : null);
    if (inputImages) {
      normalizedImages = Array.isArray(inputImages)
        ? inputImages
        : typeof inputImages === "string"
        ? [inputImages]
        : [];
    }
  }

  const product = await prisma.product.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: Number(price) }),
      ...(unit !== undefined && { unit }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(category !== undefined && { category }),
      description: updatedDescription,
      photos: normalizedImages,
      image: normalizedImages[0] || null,
      ...(status !== undefined ? { status } : { status: existing.status }),
    },
  });

  res.status(200).json({
    success: true,
    product: formatProductResponse(product),
  });
});

// Update product status (Admin Only - Approve/Reject)
exports.updateProductStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be APPROVED, REJECTED, or PENDING");
  }

  const existing = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  const updatedProduct = await prisma.product.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.status(200).json({
    success: true,
    message: `Product status successfully updated to ${status}`,
    product: formatProductResponse(updatedProduct),
  });
});

// Delete product
exports.deleteProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    throw new ApiError(404, "Product not found");
  }

  // Allow deletion if admin or item owner
  if (req.user && req.user.role !== "admin" && existing.sellerId !== req.user.id) {
    throw new ApiError(403, "You do not have permission to delete this product");
  }

  await prisma.product.delete({
    where: { id: req.params.id },
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
});