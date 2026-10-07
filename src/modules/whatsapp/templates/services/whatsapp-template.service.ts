import axios from "axios";
import { config } from "../../../../config/index.js";
import { IntegrationProvider } from "../../../../models/integration.model.js";
import {
  TPaginatedResponse,
  TQueryParams,
} from "../../../../types/api-response.type.js";
import { buildPagination } from "../../../../utils/paginationBuilder.js";
import { IntegrationCredentialRepository } from "../../../integrations/repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../../../integrations/repositories/integration.repository.js";
import { WhatsAppAccountRepository } from "../../account/repositories/whatsapp-account.repository.js";
import { metaResumableUploadClient } from "../../shared/clients/whatsapp-resumable-upload.client.js";
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


    console.log(exists)

    if (exists) {
      throw new Error("Template with this name already exists.");
    }

    // 2. Integration
    const integration =
      await this.integrationRepository.findByAccountAndProvider(
        data.accountId,
        IntegrationProvider.WHATSAPP,
      );

      console.log(integration)

    if (!integration) {
      throw new Error("WhatsApp integration not found.");
    }

    // 3. WhatsApp Account
    const whatsappAccount =
      await this.whatsappAccountRepository.findByIntegrationId(
        String(integration._id),
      );

       console.log(whatsappAccount)
    if (!whatsappAccount) {
      throw new Error("WhatsApp account not found.");
    }

    // 4. Credentials
    const credential =
      await this.integrationCredentialRepository.findByIntegrationId(
        String(integration._id),
      );

      console.log(credential)

    if (!credential?.accessToken) {
      throw new Error("WhatsApp access token not found.");
    }

    // 5. Prepare Meta Components as required by Meta
    const metaComponents = await this.prepareMetaComponents(
      data.components,
      credential.accessToken,
    );

    console.log(metaComponents)

    // 6. Create Template in Meta
    const isAuthentication =
      String(data.category).toUpperCase() === "AUTHENTICATION";

    const metaPayload: Record<string, unknown> = {
      name: data.name,
      language: data.language,
      category: data.category,
      components: metaComponents,
    };

    // Auth templates use preset body text — Meta docs omit parameter_format
    if (!isAuthentication) {
      metaPayload.parameter_format = data.parameter_format;
    }

    if (data.message_send_ttl_seconds) {
      metaPayload.message_send_ttl_seconds = data.message_send_ttl_seconds;
    }

    const metaTemplate = await metaTemplateClient.createTemplate({
      wabaId: whatsappAccount.wabaInfo.id,
      accessToken: credential.accessToken,
      payload: metaPayload,
    });

    console.log(metaTemplate)

    // 7. Save in MongoDB (Kyra fields kept; Meta-only payload already used above)
    const template = await this.templateRepository.create({
      accountId: data.accountId,
      name: data.name,
      language: data.language,
      category: data.category,
      parameterFormat: data.parameter_format,
      components: this.sanitizeComponentsForStorage(data.components),
      variableMappings: data.variableMappings || [],
      wabaId: whatsappAccount.wabaInfo.id,
      phoneNumberId: whatsappAccount.phoneNumberInfo.id,
      integrationId: integration._id,
      whatsappAccountId: whatsappAccount._id,
      metaTemplateId: metaTemplate.id,
      status: metaTemplate.status ?? "PENDING",
      lastUsedAt: null,
      isFavourite: false,
    });

    return template;
  }

  /** Persist for Kyra: keep media links, drop component-level variableMappings. */
  private stripComponentVariableMappings(component: any) {
    if (!component || typeof component !== "object") return component;
    const { variableMappings: _variableMappings, ...rest } = component;
    return rest;
  }

  private sanitizeComponentsForStorage(components: any[]) {
    return (components || []).map((component) => {
      if (component?.type === "CAROUSEL") {
        return {
          type: "CAROUSEL",
          cards: (component.cards || []).map((card: any) => ({
            components: (card.components || []).map((cardComponent: any) =>
              this.stripComponentVariableMappings(cardComponent),
            ),
          })),
        };
      }

      return this.stripComponentVariableMappings(component);
    });
  }

  private async uploadMediaHandle(
    media: { link: string; name: string; size: number; mimeType: string },
    accessToken: string,
  ) {
    const response = await axios.get(media.link, {
      responseType: "arraybuffer",
    });

    const fileBuffer = Buffer.from(response.data);

    const uploadSession = await metaResumableUploadClient.createUploadSession({
      appId: config.meta.APP_ID,
      accessToken,
      fileName: media.name,
      fileSize: media.size,
      mimeType: media.mimeType,
    });

    const uploadResult = await metaResumableUploadClient.uploadFile({
      uploadSessionId: uploadSession.id,
      accessToken,
      file: fileBuffer,
      fileSize: media.size,
      mimeType: media.mimeType,
    });

    return uploadResult.h as string;
  }

  /** Meta rejects Kyra-only keys like variableMappings / media on components. */
  private toMetaSafeComponent(component: any) {
    if (!component || typeof component !== "object") return component;

    const {
      variableMappings: _variableMappings,
      media: _media,
      ...metaComponent
    } = component;

    return metaComponent;
  }

  private async prepareCarouselComponent(
    component: any,
    accessToken: string,
  ) {
    const cards = [];

    for (const card of component.cards || []) {
      const cardComponents = [];

      for (const cardComponent of card.components || []) {
        if (
          cardComponent.type === "HEADER" &&
          (cardComponent.format === "IMAGE" ||
            cardComponent.format === "VIDEO") &&
          cardComponent.media
        ) {
          const handle = await this.uploadMediaHandle(
            cardComponent.media,
            accessToken,
          );

          cardComponents.push({
            type: "HEADER",
            format: cardComponent.format,
            example: {
              header_handle: [handle],
            },
          });
          continue;
        }

        cardComponents.push(this.toMetaSafeComponent(cardComponent));
      }

      cards.push({ components: cardComponents });
    }

    return {
      type: "CAROUSEL",
      cards,
    };
  }

  private async prepareMetaComponents(components: any[], accessToken: string) {
    const metaComponents = [];

    for (const component of components) {
      if (component.type === "CAROUSEL") {
        metaComponents.push(
          await this.prepareCarouselComponent(component, accessToken),
        );
        continue;
      }

      // BODY, FOOTER, TEXT HEADER
      if (component.type !== "HEADER" || component.format === "TEXT") {
        metaComponents.push(this.toMetaSafeComponent(component));
        continue;
      }

      // HEADER IMAGE / VIDEO / DOCUMENT
      const handle = await this.uploadMediaHandle(component.media, accessToken);

      metaComponents.push({
        type: "HEADER",
        format: component.format,
        example: {
          header_handle: [handle],
        },
      });
    }

    return metaComponents;
  }
}
