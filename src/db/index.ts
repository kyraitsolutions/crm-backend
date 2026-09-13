import mongoose from "mongoose";
import { config } from "../config/index.js";
import { ContactModel } from "../models/contact.model.js";
import logger from "../utils/logger.js";

export async function initDB() {
  try {
    await mongoose.connect(config.db.url);
    try {
      await ContactModel.syncIndexes();
    } catch (error) {
      logger.warn("Contact index sync skipped", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}
