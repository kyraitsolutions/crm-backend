import { historyQueue } from "../../../../queue/whatsapp/history.queue.js";

export class HistorySyncHandler {
  public async handle(payload: any): Promise<void> {
    console.log("HistorySyncHandler", JSON.stringify(payload, null, 2));

    const { metadata, history, messages } = payload;

    // Ignore invalid payloads
    if (
      (!history || history.length === 0) &&
      (!messages || messages.length === 0)
    ) {
      return;
    }

    await historyQueue.add(
      {
        phoneNumberId: metadata?.phone_number_id,
        history,
        messages,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}

export const historySyncHandler = new HistorySyncHandler();
