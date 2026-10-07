import mongoose, { Types } from "mongoose";
import { IntegrationProvider } from "../../../models/integration.model.js";
import { WhatsAppClient } from "../../../providers/whatsapp/whatsapp.client.js";
import { TApiResponse } from "../../../types/api-response.type.js";
// import { SyncStatus } from "../../whatsapp/account/models/whatsapp-account.model.js";
import { WhatsAppAccountRepository } from "../../whatsapp/account/repositories/whatsapp-account.repository.js";
import { IntegrationCredentialRepository } from "../repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";
import { ActivityLogService } from "../../../services/activityLog.service.js";

// type SyncState = {
//   status: SyncStatus;
//   requestId: string | null;
//   lastAttemptAt: Date | null;
//   lastErrorCode: number | null;
//   lastErrorMessage: string | null;
// };

export class WhatsAppIntegrationService {
  constructor(
    private whatsappClient = new WhatsAppClient(),
    private integrationRepo = new IntegrationRepository(),
    private credentialRepo = new IntegrationCredentialRepository(),
    private whatsappRepo = new WhatsAppAccountRepository(),
  ) {}
  private activityLogService = new ActivityLogService();

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

      // console.log("Business", business);

      // 5. Subscribe Webhook
      const subscribedApps = await this.whatsappClient.subscribeWebhook(
        business.wabaInfo.id,
        accessToken,
      );

      // await this.whatsappRepo.findByPhoneNumberId(business.phoneNumberInfo.id);

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
          tokenExpiresAt: tokenExpiresAt,
        },
        session,
      );

      // 8. Create WhatsApp Account
      // Coexistence (isOnBizApp): open / refresh 24h contact-sync window only when null
      const isOnBizApp = Boolean(business.phoneNumberInfo?.isOnBizApp);
      
      await this.whatsappRepo.createAndUpdate(
        {
          integrationId: integration.id,
          businessInfo: business.businessInfo,
          wabaInfo: business.wabaInfo,
          phoneNumberInfo: business.phoneNumberInfo,
          profile: business.businessProfile,
          webhookSubscribed: subscribedApps.success,
          isConnected: true,
          ...(isOnBizApp
            ? { contactSyncWindowStartedAt: new Date() }
            : {}),
        },
        session,
      );

      await session.commitTransaction();
      await this.activityLogService.logCreate({
        accountId: payload.accountId,
        organizationId: payload.organizationId,
        entityType: "integration",
        entityId: String(integration.id),
        actor: { type: "user", name: "" },
        metadata: { provider: IntegrationProvider.WHATSAPP },
      });

      return {
        doc:integration
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async disconnect({
    integrationId,
    accountId,
  }: {
    integrationId: string;
    accountId: string;
  }) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // 1. Check integration exists
      const integration = await this.integrationRepo.findByFilter(
        {
          _id: new Types.ObjectId(integrationId),
          accountId: new Types.ObjectId(accountId),
          provider: IntegrationProvider.WHATSAPP,
        },
        session,
      );

      if (!integration) {
        throw new Error("WhatsApp integration not found");
      }

      // 2. Disconnect integration
      const updatedIntegration = await this.integrationRepo.disconnect(
        integrationId,
        session,
      );

      // 3. Disconnect WhatsApp account
      const updatedWhatsAppAccount = await this.whatsappRepo.disconnect(
        integrationId,
        session,
      );

      // 4. Commit transaction
      await session.commitTransaction();

      await this.activityLogService.logDelete({
        accountId,
        organizationId: String((integration as any)?.organizationId || ""),
        entityType: "integration",
        entityId: integrationId,
        actor: { type: "user", name: "" },
        metadata: { provider: IntegrationProvider.WHATSAPP },
        deletedData: { provider: IntegrationProvider.WHATSAPP },
      });

      return {
        doc: {
          integration: updatedIntegration,
          whatsappAccount: updatedWhatsAppAccount,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
