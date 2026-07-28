// shared/clients/meta-resumable-upload.client.ts
import { WhatsappApiClient } from "./whatsapp-api.client.js";

interface CreateUploadSessionParams {
  appId: string;
  accessToken: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface UploadFileParams {
  uploadSessionId: string;
  accessToken: string;
  file: Buffer;
  mimeType: string;
  fileSize: number;
}

export class MetaResumableUploadClient extends WhatsappApiClient {
  // Create a new upload session.
  async createUploadSession({
    appId,
    accessToken,
    fileName,
    fileSize,
    mimeType,
  }: CreateUploadSessionParams) {
    return this.post(`/${appId}/uploads`, accessToken, {
      file_name: fileName,
      file_length: fileSize,
      file_type: mimeType,
    });
  }

  // Upload a file to an existing upload session.
  async uploadFile({
    uploadSessionId,
    accessToken,
    file,
    mimeType,
    fileSize,
  }: UploadFileParams) {
    return this.postBinary(`/${uploadSessionId}`, accessToken, file, {
      "Content-Type": mimeType,
      "Content-Length": String(fileSize),
      file_offset: "0",
    });
  }
}

export const metaResumableUploadClient = new MetaResumableUploadClient();
