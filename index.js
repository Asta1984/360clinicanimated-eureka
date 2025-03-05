const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const logger = require("./logger");
require('dotenv').config();

// Import route modules
const { doctorRouter } = require("./routes/doctor");
const { patientRouter } = require("./routes/patient");
const { appointmentRouter } = require("./routes/appointment");
const { authRouter } = require("./routes/auth");

// Create Express app
const app = express();

// Security Middleware
app.use(helmet()); // Helps secure Express apps by setting various HTTP headers

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/appointments", appointmentRouter);
app.use("/api/v1/auth", authRouter);

// Global error handler middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled Error', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path
  });

  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// Not found handler middleware
app.use((req, res, next) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    message: "Route not found"
  });
});

// Main function to connect to database and start server
async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL);
    logger.info("Connected to MongoDB successfully");

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running at port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to the database", error);
    process.exit(1);
  }
}

// Handle any unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle any uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
main();