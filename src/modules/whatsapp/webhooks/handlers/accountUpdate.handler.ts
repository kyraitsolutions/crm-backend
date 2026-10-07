import {
  SyncStatus,
  WhatsAppAccountModel,
} from "../../account/models/whatsapp-account.model.js";
import type { TWhatsAppAccountUpdateValue } from "../types/index.js";

const DISCONNECT_EVENTS = new Set([
  "PARTNER_APP_UNINSTALLED",
  "PARTNER_REMOVED",
]);

const emptySyncState = () => ({
  status: SyncStatus.NOT_REQUESTED,
  requestId: null,
  lastAttemptAt: null,
  lastErrorCode: null,
  lastErrorMessage: null,
});

export class AccountUpdateHandler {
  public async handle(payload: TWhatsAppAccountUpdateValue): Promise<void> {
    console.log("accountUpdateHandler", payload);
    const { event, waba_info } = payload;
    const wabaId = waba_info?.waba_id;

    if (!wabaId || !DISCONNECT_EVENTS.has(String(event || ""))) {
      return;
    }

    // Disconnect / uninstall → clear 24h sync window + reset sync state
    await WhatsAppAccountModel.updateOne(
      {
        "wabaInfo.id": wabaId,
      },
      {
        $set: {
          isConnected: false,
          webhookSubscribed: false,
          contactSyncWindowStartedAt: null,
          contactSync: emptySyncState(),
          historySync: emptySyncState(),
        },
      },
    );
  }
}

export const accountUpdateHandler = new AccountUpdateHandler();
