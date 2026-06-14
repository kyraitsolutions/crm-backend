import mongoose from "mongoose";
import { IntegrationProvider } from "../../../models/integration.model";
import { WhatsAppClient } from "../../../providers/whatsapp/whatsapp.client";
import { WhatsAppAccountRepository } from "../../whatsapp/repositories/whatsapp-account.repository";
import { IntegrationCredentialRepository } from "../repositories/integration-credential.repository";
import { IntegrationRepository } from "../repositories/integration.repository";

export class IntegrationService {
  constructor(
    private whatsappClient = new WhatsAppClient(),
    private integrationRepo = new IntegrationRepository(),
    private credentialRepo = new IntegrationCredentialRepository(),
    private whatsappRepo = new WhatsAppAccountRepository(),
  ) {}

  async getIntegration(payload: {
    accountId: string;
    provider: IntegrationProvider;
  }) {
    const integration = await this.integrationRepo.findByAccountAndProvider(
      payload.accountId,
      payload.provider,
    );

    if (!integration) {
      return {
        doc: {
          connected: false,
        },
      };
    }

    switch (payload.provider) {
      case IntegrationProvider.WHATSAPP: {
        const whatsapp = await this.whatsappRepo.findByIntegrationId(
          String(integration._id),
        );

        return {
          doc: {
            connected: true,
            provider: IntegrationProvider.WHATSAPP,
            data: whatsapp,
          },
        };
      }

      default:
        return {
          doc: {
            connected: true,
            provider: payload.provider,
          },
        };
    }
  }

  async getWhatsAppConnectUrl({
    accountId,
    organizationId,
  }: {
    accountId: string;
    organizationId: string;
  }) {
    const connectUrl = this.whatsappClient.generateConnectUrl({
      accountId,
      organizationId,
    });

    return {
      doc: {
        connectUrl,
      },
    };
  }

  async completeWhatsAppSignup(payload: {
    code: string;
    accountId: string;
    organizationId: string;
  }) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const token = await this.whatsappClient.exchangeCode(payload.code);
      const accessToken = token.access_token;
      const tokenType = token.token_type;
      const expiresIn = token.expires_in;

      // 1. Get Business Info for WhatsApp
      const business =
        await this.whatsappClient.getEmbeddedSignupDetails(accessToken);

      // 2. Create Integration for Whats'App
      const integration = await this.integrationRepo.createAndUpdate(
        {
          organizationId: payload.organizationId,
          accountId: payload.accountId,
          provider: IntegrationProvider.WHATSAPP,
        },
        session,
      );

      // 3. Store Credential for WhatsApp
      await this.credentialRepo.createAndUpdate(
        {
          integrationId: integration.id,
          accessToken,
          type: tokenType,
          tokenExpiresAt: new Date(expiresIn * 1000),
        },
        session,
      );

      // 4. Create WhatsApp Account
      await this.whatsappRepo.createAndUpdate(
        {
          integrationId: integration.id,
          businessInfo: business.businessInfo,
          wabaInfo: business.wabaInfo,
          phoneNumberInfo: business.phoneNumberInfo,
          profile: business.businessProfile,
        },
        session,
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
