import { IntegrationProvider, IntegrationStatus } from "../../../models/integration.model.js";
import { MetaAccountRepository } from "../../meta/account/repositories/meta-account.repository.js";
import { WhatsAppAccountRepository } from "../../whatsapp/account/repositories/whatsapp-account.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";

export class IntegrationService {
  constructor(
    private integrationRepo = new IntegrationRepository(),
    private whatsappRepo = new WhatsAppAccountRepository(),
    private metaRepo = new MetaAccountRepository(),
  ) { }

  async getIntegration(payload: {
    accountId: string;
    provider: IntegrationProvider;
  }) {
    let integration = await this.integrationRepo.findByAccountAndProvider(
      payload.accountId,
      payload.provider,
    );

    if (
      !integration &&
      payload.provider === IntegrationProvider.INSTAGRAM
    ) {
      integration = await this.integrationRepo.findByAccountAndProvider(
        payload.accountId,
        IntegrationProvider.FACEBOOK,
      );
    }

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
            id: String(integration.id),
            connected: true,
            provider: IntegrationProvider.WHATSAPP,
            data: whatsapp,
          },
        };
      }

      case IntegrationProvider.FACEBOOK:
      case IntegrationProvider.INSTAGRAM: {
        const meta = await this.metaRepo.findByIntegrationId(
          String(integration._id),
        );

        if (
          payload.provider === IntegrationProvider.INSTAGRAM &&
          !meta?.instagram?.id
        ) {
          return {
            doc: {
              connected: false,
            },
          };
        }

        return {
          doc: {
            id: String(integration.id),
            connected: true,
            provider: payload.provider,
            data: meta,
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

  async resolveWhatsAppByPhoneNumberId(phoneNumberId: string) {
    const id = String(phoneNumberId || "").trim();
    if (!id) return null;

    const connected = await this.integrationRepo.findByFilter({
      provider: IntegrationProvider.WHATSAPP,
      providerResourceId: id,
      status: IntegrationStatus.CONNECTED,
    });
    if (connected) return connected;

    const anyStatus = await this.integrationRepo.findByFilter({
      provider: IntegrationProvider.WHATSAPP,
      providerResourceId: id,
    });
    if (anyStatus) return anyStatus;

    const whatsappAccount = await this.whatsappRepo.findByPhoneNumberId(id);
    if (!whatsappAccount?.integrationId) return null;

    return this.integrationRepo.findByFilter({
      _id: whatsappAccount.integrationId,
    });
  }
}
