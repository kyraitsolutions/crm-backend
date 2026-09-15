import { Job } from "bull";
import { whatsappAiAgentQueue } from "../../queue/whatsapp/ai-agent.queue.js";
import type { WhatsAppAiAgentJobData } from "../../queue/whatsapp/ai-agent.queue.js";
import { whatsappAiSalesAgentService } from "../../modules/whatsapp/ai-agent/services/whatsapp-ai-sales-agent.service.js";
import logger from "../../utils/logger.js";

whatsappAiAgentQueue.process("process", 2, async (job: Job<WhatsAppAiAgentJobData>) => {
  logger.info("WHATSAPP_AI_AGENT_JOB_START", {
    jobId: job.id,
    messageId: job.data.messageId,
    conversationId: job.data.conversationId,
  });
  return whatsappAiSalesAgentService.handleIncoming(job.data);
});
