const prisma = require("../config/prisma");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, phoneNumber, whatsappNumber, role, county, town } = req.body;

  // Phone number is required for direct buyer-seller marketplace contacts
  if (!name || !email || !password || !phoneNumber) {
    throw new ApiError(400, "Name, email, password, and phone number are required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(409, "Email already in use");

  const hashedPassword = await hashPassword(password);

  // Validate allowed roles (defaulting to 'customer' if omitted)
  const assignedRole = role && ["customer", "seller", "admin"].includes(role) ? role : "customer";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      whatsappNumber: whatsappNumber || phoneNumber, // Default WhatsApp to phone if omitted
      role: assignedRole,
      county,
      town
    }
  });

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

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, "Email and password required");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(401, "Invalid credentials");

  const ok = await comparePassword(password, user.password);
  if (!ok) throw new ApiError(401, "Invalid credentials");

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