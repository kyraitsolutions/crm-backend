import { WhatsappApiClient } from "../../shared/clients/whatsapp-api.client.js";

interface SendMessageParams {
  phoneNumberId: string;
  accessToken: string;
  payload: Record<string, any>;
}

export class WhatsappMessageClient extends WhatsappApiClient {
  public async sendMessage({
    phoneNumberId,
    accessToken,
    payload,
  }: SendMessageParams) {
    return this.post(`/${phoneNumberId}/messages`, accessToken, payload);
  }

  async getMedia({
    accessToken,
    mediaId,
  }: {
    accessToken: string;
    mediaId: string;
  }) {
    return this.get(`/${mediaId}`, accessToken);
  }

  async downloadMedia({
    accessToken,
    url,
  }: {
    accessToken: string;
    url: string;
  }) {
    return this.download(url, accessToken);
  }
}

export const whatsappMessageClient = new WhatsappMessageClient();
