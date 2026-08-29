import dotenv from "dotenv";
import mongoose from "mongoose";
import { config } from "../config/index.js";
import { startWorker } from "./email.worker.js";

dotenv.config();

async function start() {
  await mongoose.connect(config.db.url);
  console.log("✅ MongoDB connected inside worker process");

  // Register all workers
  await import("./whatsapp/index.js");
  startWorker();
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
