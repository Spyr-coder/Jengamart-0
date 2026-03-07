require("dotenv").config();

const app = require("./app");
const prisma = require("./config/prisma");
const seedAdmin = require("./config/seedAdmin");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await seedAdmin();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    const shutdown = async () => {
      console.log("Shutting down gracefully...");
      await prisma.$disconnect();
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();