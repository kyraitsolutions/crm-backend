import Queue from "bull";
import { redisConfig } from "../../config/redis.config.js";
import { defaultJobOptions } from "../../config/bull.config.js";

export type WhatsAppAiAgentJobData = {
  organizationId: string;
  accountId: string;
  conversationId: string;
  messageId: string;
  phone: string;
  inboundText: string;
  inboundType?: string;
  contactName?: string;
};

export const whatsappAiAgentQueue = new Queue<WhatsAppAiAgentJobData>(
  "whatsapp-ai-agent",
  {
    redis: redisConfig,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
    },
  },
);

whatsappAiAgentQueue.on("ready", () => {
  console.log("✅ WhatsApp AI Agent Queue Connected");
});

whatsappAiAgentQueue.on("error", (error) => {
  console.error("❌ WhatsApp AI Agent Queue Error", error);
});

whatsappAiAgentQueue.on("failed", (job, error) => {
  console.error(`❌ WhatsApp AI Agent Job ${job?.id} failed`, error);
});

export async function enqueueWhatsAppAiAgentJob(data: WhatsAppAiAgentJobData) {
  if (!data.messageId) return null;
  try {
    return await whatsappAiAgentQueue.add("process", data, {
      jobId: data.messageId,
      delay: 1500,
    });
  } catch (error: any) {
    if (String(error?.message || "").includes("already exists")) {
      return null;
    }
    throw error;
  }
}
