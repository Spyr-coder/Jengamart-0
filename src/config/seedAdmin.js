const prisma = require("./prisma");
const { hashPassword } = require("../utils/password");

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const hashed = await hashPassword(password);

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "admin"
    }
  });

  console.log("✅ Admin account seeded (DB):", email);
};

module.exports = seedAdmin;