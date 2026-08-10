import FormData from "form-data";
import { WhatsappApiClient } from "./whatsapp-api.client.js";

type UploadMediaPayload = {
  accessToken: string;
  phoneNumberId: string;
  file: Express.Multer.File;
};

export class WhatsappMediaClient extends WhatsappApiClient {
  async uploadMedia({ accessToken, phoneNumberId, file }: UploadMediaPayload) {
    const form = new FormData();

    form.append("messaging_product", "whatsapp");

    form.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    return this.postFormData(`/${phoneNumberId}/media`, accessToken, form);
  }
}

export const whatsappMediaClient = new WhatsappMediaClient();
