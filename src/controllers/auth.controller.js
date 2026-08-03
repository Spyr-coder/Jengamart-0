const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

// ==========================================
// 1. REGISTER USER / SELLER
// ==========================================
exports.register = asyncHandler(async (req, res) => {
  const { 
    name, 
    email, 
    password, 
    phone, 
    phoneNumber, 
    whatsapp, 
    whatsappNumber, 
    role, 
    county, 
    town,
    hardwareName,
    firmEmail 
  } = req.body;

  // Accept either 'phoneNumber' or 'phone' from payload
  const finalPhone = phoneNumber || phone;
  const finalWhatsapp = whatsappNumber || whatsapp || finalPhone;

  // Validate essential fields
  if (!name || !email || !password || !finalPhone) {
    throw new ApiError(400, "Name, email, password, and phone number are required");
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Normalize role parameter (handle uppercase/lowercase strings)
  const normalizedRole = typeof role === "string" ? role.toLowerCase().trim() : "";
  const allowedRoles = ["customer", "seller", "admin"];
  const assignedRole = allowedRoles.includes(normalizedRole) ? normalizedRole : "customer";

  // Create user record in DB
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phoneNumber: finalPhone,
      whatsappNumber: finalWhatsapp,
      role: assignedRole,
      county: county || null,
      town: town || null,
    }
  });

  // Generate JWT token
  const token = generateToken({ id: user.id, role: user.role });

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      county: user.county,
      town: user.town
    }
  });
});

// ==========================================
// 2. LOGIN USER / SELLER / ADMIN
// ==========================================
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken({ id: user.id, role: user.role });

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      whatsappNumber: user.whatsappNumber,
      county: user.county,
      town: user.town
    }
  });
});