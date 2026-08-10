import mongoose from "mongoose";
import { WhatsAppClient } from "../../../providers/whatsapp/whatsapp.client.js";
import { WhatsAppAccountRepository } from "../../whatsapp/account/repositories/whatsapp-account.repository.js";
import { IntegrationCredentialRepository } from "../repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";
import { IntegrationProvider } from "../../../models/integration.model.js";
import { AxiosError } from "axios";
import { SyncStatus } from "../../whatsapp/account/models/whatsapp-account.model.js";
import { MetaApiErrorResponse } from "../../../types/index.js";
import { TApiResponse } from "../../../types/api-response.type.js";

type SyncState = {
  status: SyncStatus;
  requestId: string | null;
  lastAttemptAt: Date | null;
  lastErrorCode: number | null;
  lastErrorMessage: string | null;
};

export class WhatsAppIntegrationService {
  constructor(
    private whatsappClient = new WhatsAppClient(),
    private integrationRepo = new IntegrationRepository(),
    private credentialRepo = new IntegrationCredentialRepository(),
    private whatsappRepo = new WhatsAppAccountRepository(),
  ) {}

  async completeWhatsAppSignup(payload: {
    code: string;
    accountId: string;
    organizationId: string;
  }): Promise<TApiResponse<{}>> {
    const session = await mongoose.startSession();

    //  Start Transaction
    session.startTransaction();

    try {
      // 1. Exchange Code for Access Token
      const token = await this.whatsappClient.exchangeCode(payload.code);

      // 2. Get Token Details
      const accessToken = token.access_token;
      const tokenType = token.token_type;

      // 3. Get Debug Token
      const debugToken = await this.whatsappClient.getDebugToken(accessToken);

      const tokenExpiresAt =
        debugToken.expires_at && debugToken.expires_at > 0
          ? new Date(debugToken.expires_at)
          : null;

      // 4. Get Business Info for WhatsApp
      const business =
        await this.whatsappClient.getEmbeddedSignupDetails(accessToken);

      console.log("Business", business);

      // 5. Subscribe Webhook
      const subscribedApps = await this.whatsappClient.subscribeWebhook(
        business.wabaInfo.id,
        accessToken,
      );

      const account = await this.whatsappRepo.findByPhoneNumberId(
        business.phoneNumberInfo.id,
      );

      let contactSync: SyncState = account?.contactSync ?? {
        status: SyncStatus.NOT_REQUESTED,
        requestId: null,
        lastAttemptAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
      };

      // let historySync: SyncState = account?.historySync ?? {
      //   status: SyncStatus.NOT_REQUESTED,
      //   requestId: null,
      //   lastAttemptAt: null,
      //   lastErrorCode: null,
      //   lastErrorMessage: null,
      // };

      if (
        contactSync.status !== SyncStatus.COMPLETED &&
        contactSync.status !== SyncStatus.NOT_SUPPORTED
      ) {
        try {
          const response = await this.whatsappClient.startContactSync(
            business.phoneNumberInfo.id,
            accessToken,
          );

          contactSync = {
            status: SyncStatus.COMPLETED,
            requestId: response.request_id,
            lastAttemptAt: new Date(),
            lastErrorCode: null,
            lastErrorMessage: null,
          };
        } catch (error) {
          const err = error as AxiosError<MetaApiErrorResponse>;
          const metaError = err.response?.data?.error;

          if (metaError?.code === 131000) {
            contactSync = {
              status: SyncStatus.NOT_SUPPORTED,
              requestId: null,
              lastAttemptAt: new Date(),
              lastErrorCode: metaError.code,
              lastErrorMessage: metaError.message,
            };
          } else {
            contactSync = {
              status: SyncStatus.FAILED,
              requestId: null,
              lastAttemptAt: new Date(),
              lastErrorCode: metaError?.code ?? null,
              lastErrorMessage: metaError?.message ?? "Unknown Error",
            };

            throw error;
          }
        }
      }

      // if (
      //   historySync.status !== SyncStatus.COMPLETED &&
      //   historySync.status !== SyncStatus.NOT_SUPPORTED
      // ) {
      //   try {
      //     const response = await this.whatsappClient.startHistorySync(
      //       business.phoneNumberInfo.id,
      //       accessToken,
      //     );

      //     historySync = {
      //       status: SyncStatus.COMPLETED,
      //       requestId: response.request_id,
      //       lastAttemptAt: new Date(),
      //       lastErrorCode: null,
      //       lastErrorMessage: null,
      //     };
      //   } catch (error) {
      //     const err = error as AxiosError<MetaApiErrorResponse>;
      //     const metaError = err.response?.data?.error;

      //     if (metaError?.code === 131000) {
      //       historySync = {
      //         status: SyncStatus.NOT_SUPPORTED,
      //         requestId: null,
      //         lastAttemptAt: new Date(),
      //         lastErrorCode: metaError.code,
      //         lastErrorMessage: metaError.message,
      //       };
      //     } else {
      //       historySync = {
      //         status: SyncStatus.FAILED,
      //         requestId: null,
      //         lastAttemptAt: new Date(),
      //         lastErrorCode: metaError?.code ?? null,
      //         lastErrorMessage: metaError?.message ?? "Unknown Error",
      //       };

      //       throw error;
      //     }
      //   }
      // }

      // 6. Create Integration for Whats'App
      const integration = await this.integrationRepo.createAndUpdate(
        {
          organizationId: payload.organizationId,
          accountId: payload.accountId,
          providerResourceId: business.phoneNumberInfo.id,
          provider: IntegrationProvider.WHATSAPP,
        },
        session,
      );

      // 7. Store Credential for WhatsApp
      await this.credentialRepo.createAndUpdate(
        {
          integrationId: integration.id,
          accessToken,
          type: tokenType,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        },
        session,
      );

      // 8. Create WhatsApp Account
      await this.whatsappRepo.createAndUpdate(
        {
          integrationId: integration.id,
          businessInfo: business.businessInfo,
          wabaInfo: business.wabaInfo,
          phoneNumberInfo: business.phoneNumberInfo,
          profile: business.businessProfile,
          webhookSubscribed: subscribedApps.success,
          contactSync: contactSync,
          // historySync: historySync,
        },
        session,
      );

      await session.commitTransaction();

      return {
        doc: integration,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
