import { leadgenHandler } from "../handlers/leadgen.handler.js";
import logger from "../../../../utils/logger.js";

export class WebhookRouterService {
  public async route(payload: any): Promise<void> {
    logger.info("Meta webhook payload", { payload });

    if (!payload?.entry?.length) {
      return;
    }

    for (const entry of payload.entry) {
      if (!entry?.changes?.length) {
        continue;
      }

      for (const change of entry.changes) {
        await this.dispatch(change);
      }
    }
  }

  private async dispatch(change: any): Promise<void> {
    switch (change.field) {
      case "leadgen":
        await leadgenHandler.handle(change.value);
        break;

      default:
        logger.info("Unhandled Meta webhook field", {
          field: change.field,
        });
        break;
    }
  }
}
