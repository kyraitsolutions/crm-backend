import { CreateMediaUploadUrlDto } from "../dtos/media.dto.js";

// shared/utils/s3-key.builder.ts
export enum MediaType {
  CHATBOT_IMAGE = "CHATBOT",
  WHATSAPP_INCOMING = "WHATSAPP_INCOMING",
  WHATSAPP_OUTGOING = "WHATSAPP_OUTGOING",
  WHATSAPP_TEMPLATE = "WHATSAPP_TEMPLATE",
}

export class S3KeyBuilder {
  static build(dto: CreateMediaUploadUrlDto) {
    const unique = `${Date.now()}-${dto.fileName}`;

    switch (dto.type) {
      case MediaType.CHATBOT_IMAGE.toLowerCase():
        return `tenants/${dto.userId}/chatbots/images/${unique}`;

      case MediaType.WHATSAPP_INCOMING:
        return `tenants/${dto.userId}/whatsapp/incoming/${dto.messageId}-${unique}`;

      case MediaType.WHATSAPP_OUTGOING:
        return `tenants/${dto.userId}/whatsapp/outgoing/${dto.messageId}-${unique}`;

      case MediaType.WHATSAPP_TEMPLATE:
        return `tenants/${dto.userId}/whatsapp/templates/${dto.templateId}-${unique}`;

      default:
        return `tenants/${dto.userId}/media/${unique}`;
    }
  }
}
