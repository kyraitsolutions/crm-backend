import { accountUpdateHandler } from "../handlers/accountUpdate.handler.js";
import { contactSyncHandler } from "../handlers/contactSync.handler.js";
import { historySyncHandler } from "../handlers/history.handler.js";
import { messagesHandler } from "../handlers/messages.handler.js";
import { templateHandler } from "../handlers/template.handler.js";

export class WebhookRouterService {
  public async route(payload: any): Promise<void> {
    // console.log("WebhookRouterService", JSON.stringify(payload, null, 2));

    // Ignore invalid payloads
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
      case "messages":
        await messagesHandler.handle(change.value);
        break;

      case "account_update":
        await accountUpdateHandler.handle(change.value);
        break;

      case "smb_app_state_sync":
        await contactSyncHandler.handle(change.value);
        break;

      // case "history":
      //   await historySyncHandler.handle(change.value);
      //   break;

      case "message_template_status_update":
      case "message_template_quality_update":
        await templateHandler.handle(change.value);
        break;

      //   case "phone_number_name_update":
      //     await this.phoneHandler.handle(change.value);
      //     break;

      //   case "account_alerts":
      //     await this.accountHandler.handle(change.value);
      //     break;

      //   default:
      //     await this.unknownHandler.handle(change);
      //     break;
    }
  }
}
