import { IntegrationProvider } from "../../../models/integration.model.js";
import { WhatsAppAccountRepository } from "../../whatsapp/account/repositories/whatsapp-account.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";

export class IntegrationService {
  constructor(
    private integrationRepo = new IntegrationRepository(),
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

  async getIntegrationByFilter(filter: any) {
    return this.integrationRepo.findByFilter(filter);
  }
}
