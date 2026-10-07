import { IntegrationProvider } from "../../../../models/integration.model.js";
import { WhatsAppClient } from "../../../../providers/whatsapp/whatsapp.client.js";
import { TApiResponse } from "../../../../types/api-response.type.js";
import { HttpError } from "../../../../utils/http.error.js";
import { IntegrationCredentialRepository } from "../../../integrations/repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../../../integrations/repositories/integration.repository.js";
import { SyncStatus } from "../models/whatsapp-account.model.js";
import { WhatsAppAccountRepository } from "../repositories/whatsapp-account.repository.js";

const CONTACT_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

export class WhatsAppService {
  constructor(
    private integrationRepo = new IntegrationRepository(),
    private whatsappRepo = new WhatsAppAccountRepository(),
    private credentialRepo = new IntegrationCredentialRepository(),
    private whatsappClient = new WhatsAppClient(),
  ) {}

  async registerPhoneNumber(payload: { accountId: string; pin: string }) {
    const whatsappIntegration =
      await this.integrationRepo.findByAccountAndProvider(
        payload.accountId,
        IntegrationProvider.WHATSAPP,
      );

    if (!whatsappIntegration) {
      throw new Error("WhatsApp account not found");
    }

    const whatsappAccount = await this.whatsappRepo.findByIntegrationId(
      String(whatsappIntegration._id),
    );

    const credential = await this.credentialRepo.findByIntegrationId(
      String(whatsappIntegration._id),
    );

    const result = await this.whatsappClient.registerPhoneNumber({
      phoneNumberId: String(whatsappAccount?.phoneNumberInfo.id),
      accessToken: String(credential?.accessToken),
      pin: String(payload.pin),
    });

    // if (result?.success) {
    //   await this.whatsappRepo.updateByIntegrationId(
    //     String(whatsappIntegration._id),
    //     {
    //       "phoneNumberInfo.platformType": "CLOUD_API",
    //     },
    //   );
    // }

    return {
      doc: {
        success: result?.success,
        phoneNumberId: String(whatsappAccount?.phoneNumberInfo.id),
        platformType: String(whatsappAccount?.phoneNumberInfo.platformType),
      },
    };
  }

  async syncContacts(accountId: string): Promise<
    TApiResponse<{
      requestId: string;
      status: SyncStatus;
    }>
  > {
    const integration = await this.integrationRepo.findByAccountAndProvider(
      accountId,
      IntegrationProvider.WHATSAPP,
    );

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    const account = await this.whatsappRepo.findByIntegrationId(
      String(integration._id),
    );

    if (!account) {
      throw new Error("WhatsApp account not found.");
    }

    if (!account.phoneNumberInfo?.isOnBizApp) {
      throw HttpError.badRequest(
        "Contact sync is only available for WhatsApp Business App (coexistence) numbers.",
      );
    }

    const windowStartedAt = account.contactSyncWindowStartedAt
      ? new Date(account.contactSyncWindowStartedAt).getTime()
      : 0;

    if (!windowStartedAt) {
      throw HttpError.badRequest(
        "Contact sync window is not open. Reconnect WhatsApp Business App and try again.",
      );
    }

    if (Date.now() - windowStartedAt > CONTACT_SYNC_WINDOW_MS) {
      throw HttpError.badRequest(
        "Contact sync is only available within 24 hours of onboarding.",
      );
    }

    const credential = await this.credentialRepo.findByIntegrationId(
      String(integration._id),
    );

    if (!credential) {
      throw new Error("WhatsApp credential not found.");
    }

    const response = await this.whatsappClient.startContactSync(
      String(account?.phoneNumberInfo.id),
      String(credential?.accessToken),
    );

    await this.whatsappRepo.updateByIntegrationId(String(integration._id), {
      contactSync: {
        status: SyncStatus.REQUESTED,
        requestId: response.request_id,
        lastAttemptAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    return {
      doc: {
        requestId: response.request_id,
        status: SyncStatus.REQUESTED,
      },
    };
  }
}
