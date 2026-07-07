const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const errorHandler = require("./middlewares/error.middleware");
const swaggerSetup = require("./config/swagger");

const app = express();

const allowedOrigins = [
  "http://localhost:8080", // Added to fix your local frontend port
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed for this origin"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Added to cleanly support preflight OPTIONS requests
    allowedHeaders: ["Content-Type", "Authorization"],    // Added to authorize standard headers
    credentials: true
  })
);

app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

swaggerSetup(app);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "Fundimart API is running 🚀",
    docs: "/docs"
  });
});

app.use("/api", routes);

app.use(errorHandler);

module.exports = app;