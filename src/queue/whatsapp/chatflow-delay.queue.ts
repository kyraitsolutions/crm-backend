import Queue from "bull";
import { createBullClient, redisConfig, redisErrorMessage } from "../../config/redis.config.js";
import { defaultJobOptions } from "../../config/bull.config.js";

export type ChatflowDelayJobData = {
  sessionId: string;
  token: string;
  accountId: string;
  conversationId: string;
};

export const chatflowDelayQueue = new Queue<ChatflowDelayJobData>("whatsapp-chatflow-delay", {
  redis: redisConfig,
  createClient: createBullClient,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
  },
});

chatflowDelayQueue.on("ready", () => {
  console.log("✅ WhatsApp Chatflow Delay Queue Connected");
});

chatflowDelayQueue.on("error", (error) => {
  console.error("❌ WhatsApp Chatflow Delay Queue Error", redisErrorMessage(error));
});

chatflowDelayQueue.on("failed", (job, error) => {
  console.error(`❌ WhatsApp Chatflow Delay Job ${job?.id} failed`, error.message);
});

export async function enqueueChatflowDelay(data: ChatflowDelayJobData, delayMs: number) {
  const jobId = `delay:${data.sessionId}:${data.token}`;
  try {
    return await chatflowDelayQueue.add("resume", data, {
      jobId,
      delay: delayMs,
    });
  } catch (error: any) {
    if (String(error?.message || "").includes("already exists")) return null;
    throw error;
  }
}
