import { IntegrationCredentialRepository } from "../../../integrations/repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../../../integrations/repositories/integration.repository.js";
import { WhatsAppAccountRepository } from "../repositories/whatsapp-account.repository.js";

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
}
