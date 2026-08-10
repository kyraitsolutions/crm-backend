import {
  WHATSAPP_MEDIA,
  WhatsAppMediaType,
} from "../constants/media.constants.js";

export class MediaValidator {
  validate(file: Express.Multer.File, type: WhatsAppMediaType) {
    const config = WHATSAPP_MEDIA[type];
    console.log("config", config);

    if (!config) {
      throw new Error(`Unsupported media type: ${type}`);
    }

    if (file.size > config.maxSize) {
      throw new Error(
        `${type} size exceeds ${config.maxSize / (1024 * 1024)} MB.`,
      );
    }

    const mime: string = file.mimetype.toLowerCase();

    if (mime && !config.mimeTypes.includes(mime)) {
      throw new Error(
        `Invalid ${type} format. Allowed: ${config.mimeTypes.join(", ")}`,
      );
    }
  }
}

export const mediaValidator = new MediaValidator();
