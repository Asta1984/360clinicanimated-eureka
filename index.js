// index.js
const mongoose = require("mongoose");
const app = require("./app");
const logger = require("./logger");
require('dotenv').config();

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

// Only start the server if this file is run directly
if (require.main === module) {
  main();
}
