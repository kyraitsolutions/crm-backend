import Queue from "bull";
import { redisConfig } from "../../config/redis.config.js";
import { defaultJobOptions } from "../../config/bull.config.js";

export type KnowledgeIngestionJobData = {
  organizationId: string;
  accountId: string;
  sourceId: string;
};

export const knowledgeIngestionQueue = new Queue<KnowledgeIngestionJobData>(
  "ai-knowledge-ingestion",
  {
    redis: redisConfig,
    defaultJobOptions: defaultJobOptions
  },
);

knowledgeIngestionQueue.on("ready", () => {
  console.log("✅ AI Knowledge Ingestion Queue Connected");
});

knowledgeIngestionQueue.on("error", (error) => {
  console.error("❌ AI Knowledge Ingestion Queue Error", error);
});

knowledgeIngestionQueue.on("failed", (job, error) => {
  console.error(`❌ AI Knowledge Ingestion Job ${job?.id} failed`, error);
});

export async function enqueueKnowledgeIngestionJob(
  data: KnowledgeIngestionJobData,
) {
  if (!data.sourceId) return null;
  const jobId = `knowledge-${data.sourceId}`;
  try {
    const existing = await knowledgeIngestionQueue.getJob(jobId);
    
   
    if (existing) {
      const state = await existing.getState();
      console.log("state", state);
      if (state === "completed" || state === "failed") {
        await existing.remove();
      } else {
        return existing;
      }
    }


    return await knowledgeIngestionQueue.add("ingest", data, { jobId });

  } catch (error: any) {
    if (String(error?.message || "").includes("already exists")) {
      return null;
    }
    throw error;
  }
}
