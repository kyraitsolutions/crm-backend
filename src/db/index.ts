import mongoose from "mongoose";
import { config } from "../config/index.js";
import { ContactModel } from "../models/contact.model.js";
import logger from "../utils/logger.js";

export async function initDB() {
  try {
    await mongoose.connect(config.db.url);
    try {
      const indexes = await ContactModel.collection.indexes();
      for (const idx of indexes) {
        const key = (idx as { key?: Record<string, number> }).key || {};
        const name = String((idx as { name?: string }).name || "");
        const unique = Boolean((idx as { unique?: boolean }).unique);
        const keys = Object.keys(key);
        const isEmailPair =
          unique && keys.length === 2 && key.accountId === 1 && key.email === 1;
        const isPhonePair =
          unique && keys.length === 2 && key.accountId === 1 && key.phone === 1;
        if (
          name === "uniq_account_email" ||
          name === "uniq_account_phone" ||
          isEmailPair ||
          isPhonePair
        ) {
          try {
            await ContactModel.collection.dropIndex(name);
          } catch {
            // Index may already be gone.
          }
        }
      }
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
