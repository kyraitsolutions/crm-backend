import mongoose from "mongoose";

import { ENV } from "../constants";

export async function initDB() {
  try {
    await mongoose.connect(ENV.DATABASE_URL!);
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1); // exit if DB connection fails
  }
}
