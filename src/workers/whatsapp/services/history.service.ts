export class HistoryService {
  public async process(payload: {
    phoneNumberId: string;
    history?: any[];
    messages?: any[];
  }) {
    const { history, messages } = payload;

    // Old History Sync format
    if (messages?.length) {
      await this.processLegacyMessages(payload);
      return;
    }

    // New History Sync format
    if (history?.length) {
      await this.processHistory(payload);
      return;
    }
  }

  private async processLegacyMessages(payload: {
    phoneNumberId: string;
    messages?: any[];
  }) {}

  private async processHistory(payload: {
    phoneNumberId: string;
    history?: any[];
  }) {}
}
