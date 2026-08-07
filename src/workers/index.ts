import dotenv from "dotenv";
import mongoose from "mongoose";
import { config } from "../config/index.js";

dotenv.config();

async function start() {
  await mongoose.connect(config.db.url);
  console.log("✅ MongoDB connected");

  // Register all workers
  await import("./whatsapp/index.js");
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
