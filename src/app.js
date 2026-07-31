const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middlewares/error.middleware");
const swaggerSetup = require("./config/swagger");

const app = express();

const allowedOrigins = [
  "http://localhost:8080", 
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "https://kusaawards2026.org",
  "https://www.kusaawards2026.org",
  "https://fundimart.netlify.app", // Added Netlify frontend domain
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS not allowed for this origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], 
    allowedHeaders: ["Content-Type", "Authorization"],    
    credentials: true
  })
);

// Increased body limits to prevent 413 Payload Too Large errors on checkout
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

swaggerSetup(app);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Fundimart API is running 🚀",
    docs: "/docs"
  });
});

// Admin Moderation & Management routes
// Mounted on both /api/v1/admin and /api/admin to catch all frontend calls
if (adminRoutes) {
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/admin", adminRoutes);
}

// General API routes
app.use("/api", routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;