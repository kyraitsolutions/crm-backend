import { WhatsappApiClient } from "../../shared/clients/whatsapp-api.client.js";

export class MetaTemplateClient extends WhatsappApiClient {
  async createTemplate({ wabaId, accessToken, payload }: any) {
    return this.post(`/${wabaId}/message_templates`, accessToken, payload);
  }
}

export const metaTemplateClient = new MetaTemplateClient();
