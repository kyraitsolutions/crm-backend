import mongoose from "mongoose";
import { config } from "../config/index.js";

export async function initDB() {
  try {
    await mongoose.connect(config.db.url);
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1); // exit if DB connection fails
  }
}
