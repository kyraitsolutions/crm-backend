import Queue from "bull";
import { redisConfig } from "../../config/redis.config.js";
import { defaultJobOptions } from "../../config/bull.config.js";

export const contactSyncQueue = new Queue("whatsapp-contact-sync", {
  redis: redisConfig,
  defaultJobOptions: defaultJobOptions,
});

contactSyncQueue.on("ready", () => {
  console.log("✅ WhatsApp Contact Sync Queue Connected");
});

contactSyncQueue.on("error", (error) => {
  console.error("❌ Contact Sync Queue Error", error);
});

contactSyncQueue.on("completed", (job) => {
  console.log(`✅ Contact Sync Job ${job.id} completed`);
});

contactSyncQueue.on("failed", (job, error) => {
  console.error(`❌ Contact Sync Job ${job?.id} failed`, error);
});
