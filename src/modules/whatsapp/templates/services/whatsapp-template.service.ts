import { IntegrationProvider } from "../../../../models/integration.model.js";
import {
  TPaginatedResponse,
  TQueryParams,
} from "../../../../types/api-response.type.js";
import { buildPagination } from "../../../../utils/paginationBuilder.js";
import { IntegrationCredentialRepository } from "../../../integrations/repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../../../integrations/repositories/integration.repository.js";
import { WhatsAppAccountRepository } from "../../account/repositories/whatsapp-account.repository.js";
import { metaTemplateClient } from "../client/whatsapp-template.client.js";
import { WhatsappTemplateRepository } from "../repositories/whatsapp-template.repository.js";
import { TTemplate } from "../types/template.types.js";

export class WhatsAppTemplateService {
  private templateRepository = new WhatsappTemplateRepository();
  private whatsappAccountRepository = new WhatsAppAccountRepository();
  private integrationRepository = new IntegrationRepository();
  private integrationCredentialRepository =
    new IntegrationCredentialRepository();

  async getTemplates(
    accountId: string,
    query: TQueryParams = {},
  ): Promise<TPaginatedResponse<{ docs: TTemplate }>> {
    if (!accountId) throw new Error("AccountId is required");

    const res = await this.templateRepository.findAll(accountId, query);

    // console.log(res.docs[0]?.id)

    return {
      docs: res.docs as any[],

      pagination: buildPagination({
        page: 1,
        limit: query.limit,
        docsCount: res.docs.length,
        totalDocs: res.total,
      }),
    };
  }

  async create(data: any) {
    // 1. Duplicate check
    const exists = await this.templateRepository.findByName(
      data.accountId,
      data.name,
    );

    if (exists) {
      throw new Error("Template with this name already exists.");
    }

    // 2. Integration
    const integration =
      await this.integrationRepository.findByAccountAndProvider(
        data.accountId,
        IntegrationProvider.WHATSAPP,
      );

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    // 3. WhatsApp Account
    const whatsappAccount =
      await this.whatsappAccountRepository.findByIntegrationId(
        String(integration._id),
      );

    if (!whatsappAccount) {
      throw new Error("WhatsApp account not found.");
    }

    // 4. Credentials
    const credential =
      await this.integrationCredentialRepository.findByIntegrationId(
        String(integration._id),
      );

    if (!credential?.accessToken) {
      throw new Error("WhatsApp access token not found.");
    }

    // 5. Create Template in Meta
    const metaTemplate = await metaTemplateClient.createTemplate({
      wabaId: whatsappAccount.wabaInfo.id,
      accessToken: credential.accessToken,
      payload: {
        name: data.name,
        language: data.language,
        category: data.category,
        parameter_format: data.parameter_format,
        components: data.components,
      },
    });

    console.log("metaTemplate", metaTemplate);

    // 6. Save in MongoDB
    const template = await this.templateRepository.create({
      ...data,
      parameterFormat: data.parameter_format,
      wabaId: whatsappAccount.wabaInfo.id,
      phoneNumberId: whatsappAccount.phoneNumberInfo.id,
      integrationId: integration._id,
      whatsappAccountId: whatsappAccount._id,
      metaTemplateId: metaTemplate.id,
      status: metaTemplate.status ?? "PENDING",
    });

    return template;
  }
}
