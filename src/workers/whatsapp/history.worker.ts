import { Job } from "bull";
import { historyQueue } from "../../queue/whatsapp/history.queue.js";
import { HistoryService } from "./services/history.service.js";

const historyService = new HistoryService();

historyQueue.process(
  async (
    job: Job<{
      phoneNumberId: string;
      history?: any[];
      messages?: any[];
    }>,
  ) => {
    console.log(`Processing History Job ${job.id}`);

    await historyService.process(job.data);

    console.log(`History Job ${job.id} completed`);
  },
);
