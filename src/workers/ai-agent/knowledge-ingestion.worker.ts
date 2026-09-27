import { Job } from "bull";
import { knowledgeIngestionQueue } from "../../queue/ai-agent/knowledge-ingestion.queue.js";
import type { KnowledgeIngestionJobData } from "../../queue/ai-agent/knowledge-ingestion.queue.js";
import { aiKnowledgeService } from "../../modules/ai-agent/services/ai-knowledge.service.js";
import logger from "../../utils/logger.js";

knowledgeIngestionQueue.process(
  "ingest",
  2,
  async (job: Job<KnowledgeIngestionJobData>) => {
    logger.info("AI_KNOWLEDGE_INGEST_JOB_START", {
      jobId: job.id,
      sourceId: job.data.sourceId,
    });
    return aiKnowledgeService.ingestById(
      job.data.organizationId,
      job.data.accountId,
      job.data.sourceId,
    );
  },
);
