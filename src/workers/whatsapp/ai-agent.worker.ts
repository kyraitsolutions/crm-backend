import { Job } from "bull";
import { whatsappAiAgentQueue } from "../../queue/whatsapp/ai-agent.queue.js";
import type { WhatsAppAiAgentJobData } from "../../queue/whatsapp/ai-agent.queue.js";
import { whatsappInboundAgentService } from "../../modules/whatsapp/ai-agent/services/whatsapp-inbound-agent.service.js";
import logger from "../../utils/logger.js";

whatsappAiAgentQueue.process("process", 4, async (job: Job<WhatsAppAiAgentJobData>) => {
  // console.log("whatsappAiAgentQueue.process", job);
  logger.info("WHATSAPP_AI_AGENT_JOB_START", {
    jobId: job.id,
    messageId: job.data.messageId,
    conversationId: job.data.conversationId,
  }); 
  return whatsappInboundAgentService.handleIncoming(job.data);
}); 
