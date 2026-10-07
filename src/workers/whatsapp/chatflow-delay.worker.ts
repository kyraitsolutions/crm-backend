import { Job } from "bull";
import {
  chatflowDelayQueue,
  type ChatflowDelayJobData,
} from "../../queue/whatsapp/chatflow-delay.queue.js";
import { whatsappChatflowService } from "../../modules/whatsapp/chatflow/services/whatsapp-chatflow.service.js";
import logger from "../../utils/logger.js";

chatflowDelayQueue.process("resume", 2, async (job: Job<ChatflowDelayJobData>) => {
  logger.info("WHATSAPP_CHATFLOW_DELAY_RESUME", {
    jobId: job.id,
    conversationId: job.data.conversationId,
  });
  return whatsappChatflowService.resumeDelayed(job.data.sessionId, job.data.token);
});
