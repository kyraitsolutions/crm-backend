import { HttpError } from "../utils/http.error.js";
// services/media.service.ts

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3KeyBuilder } from "../utils/s3-key.builder..utils.js";
import { MEDIA } from "../constants/index.js";
import { CreateMediaUploadUrlDto } from "../dtos/media.dto.js";
import { config } from "../config/index.js";

export class MediaService {
  constructor(private s3: S3Client) {}

  async createMediaUploadUrl(dto: CreateMediaUploadUrlDto) {
    this.validate(dto);

    const key = S3KeyBuilder.build(dto);

    const command = new PutObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 600,
    });

    return {
      uploadUrl,
      key,
      fileUrl: `https://${config.aws.cdnDomain}/${key}`,
    };
  }

  async deleteByFileUrl(fileUrl: string) {
    const key = this.keyFromFileUrl(fileUrl);
    if (!key || !config.aws.bucket) return;
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: config.aws.bucket,
        Key: key,
      }),
    );
  }

  private keyFromFileUrl(fileUrl: string) {
    const raw = String(fileUrl || "").trim();
    if (raw.startsWith("s3:")) return raw.slice(3);
    try {
      const url = new URL(raw);
      const host = String(config.aws.cdnDomain || "")
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");
      if (!host || url.host !== host) return "";
      return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    } catch {
      return "";
    }
  }

  private validate(dto: CreateMediaUploadUrlDto) {
    const config = this.getMediaConfig(dto.mimeType);

    if (!config) {
      throw HttpError.badRequest("Unsupported media type");
    }

    if (dto.fileSize > config.maxSize) {
      throw HttpError.badRequest("File too large");
    }
  }

  private getMediaConfig(mimeType: string) {
    return Object.values(MEDIA).find((media) =>
      media.mimeTypes.includes(mimeType),
    );
  }
}
