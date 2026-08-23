import {
  SyncStatus,
  WhatsAppAccountModel,
} from "../../account/models/whatsapp-account.model.js";

export class AccountUpdateHandler {
  public async handle(payload: any): Promise<void> {
    const { event, waba_info } = payload;

    if (event !== "PARTNER_APP_UNINSTALLED") {
      return;
    }

    await WhatsAppAccountModel.updateOne(
      {
        "wabaInfo.id": waba_info.waba_id,
      },
      {
        $set: {
          webhookSubscribed: false,
          contactSync: {
            status: SyncStatus.NOT_REQUESTED,
            requestId: null,
            lastAttemptAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },

          historySync: {
            status: SyncStatus.NOT_REQUESTED,
            requestId: null,
            lastAttemptAt: null,
            lastErrorCode: null,
            lastErrorMessage: null,
          },
        },
      },
    );
  }
}

export const accountUpdateHandler = new AccountUpdateHandler();
