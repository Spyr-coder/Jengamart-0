const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const routes = require("./routes");
const errorHandler = require("./middlewares/error.middleware");
const swaggerSetup = require("./config/swagger");

const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Swagger docs
swaggerSetup(app);

// API routes
app.use("/api", routes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
