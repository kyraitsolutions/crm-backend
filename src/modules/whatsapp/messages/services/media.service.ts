import { whatsappMediaClient } from "../../shared/clients/whatsapp-media.client.js";
import { audioConverterService } from "./audio-converter.service.js";

type ResolveMediaParams = {
  //   type: "image" | "video" | "audio" | "document" | "sticker";
  media?: {
    link?: string;
    id?: string;
    caption?: string;
    // filename?: string;
  };
  file?: Express.Multer.File;
  accessToken: string;
  phoneNumberId: string;
};

export class MediaService {
  async resolve({
    media,
    file,
    accessToken,
    phoneNumberId,
  }: ResolveMediaParams) {
    // Already uploaded to Meta
    if (media?.id) {
      return {
        id: media.id,
      };
    }

    // External URL
    if (media?.link) {
      return {
        link: media.link,
      };
    }

    // Upload new file to Meta
    if (file) {
      let uploadFile = file;

      if (
        file.mimetype === "audio/wav" ||
        file.mimetype === "audio/x-wav" ||
        file.mimetype === "audio/x-pn-wav" ||
        file.mimetype === "audio/webm"
      ) {
        uploadFile = await audioConverterService.convertWavToOgg(file);
      }

      const uploaded = await whatsappMediaClient.uploadMedia({
        accessToken,
        phoneNumberId,
        file: uploadFile,
      });

      return {
        id: uploaded.id,
      };
    }

    throw new Error("Media is required.");
  }
}

export const mediaService = new MediaService();
