import Queue from "bull";
import { createBullClient, redisConfig, redisErrorMessage } from "../../config/redis.config.js";
import { defaultJobOptions } from "../../config/bull.config.js";

export const historyQueue = new Queue("whatsapp-history-sync", {
  redis: redisConfig,
  createClient: createBullClient,
  defaultJobOptions,
});

historyQueue.on("ready", () => {
  console.log("✅ WhatsApp History Queue Connected");
});

historyQueue.on("error", (error) => {
  console.error("❌ History Queue Error", redisErrorMessage(error));
});

historyQueue.on("completed", (job) => {
  console.log(`✅ History Job ${job.id} completed`);
});

historyQueue.on("failed", (job, error) => {
  console.error(`❌ History Job ${job?.id} failed`, error);
});
