import { MediaType } from "../utils/s3-key.builder..utils";

export class CreateMediaUploadUrlDto {
  userId?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  type?: MediaType;
  flowId?: string;
  messageId?: string;
  templateId?: string;

  constructor(data: Partial<CreateMediaUploadUrlDto>) {
    Object.assign(this, data);
    this.fileName = data?.fileName?.trim() as string;
    this.mimeType = data.mimeType?.trim() as string;
    this.fileSize = data.fileSize as number;
    this.validate();
  }

  private validate() {
    if (!this.fileName) throw new Error("fileName is required");
    if (!this.mimeType) throw new Error("file type is required");
    if (!this.fileSize) throw new Error("fileSize is required");

    // 🔥 conditional validation (VERY IMPORTANT)
    switch (this.type) {
      case MediaType.CHATBOT_IMAGE:
        if (!this.flowId)
          throw new Error("flowId is required for chatbot media");
        break;
      case MediaType.WHATSAPP_INCOMING:
      case MediaType.WHATSAPP_OUTGOING:
        if (!this.messageId)
          throw new Error("messageId is required for whatsapp media");
        break;
      case MediaType.WHATSAPP_TEMPLATE:
        if (!this.templateId) throw new Error("templateId is required");
        break;
    }
  }
}
