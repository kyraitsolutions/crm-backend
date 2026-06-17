// services/media.service.ts

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3KeyBuilder } from "../utils/s3-key.builder..utils";
import { MEDIA } from "../constants";
import { CreateMediaUploadUrlDto } from "../dtos/media.dto";
import { config } from "../config";

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

  private validate(dto: CreateMediaUploadUrlDto) {
    const config = this.getMediaConfig(dto.mimeType);

    if (!config) {
      throw new Error("Unsupported media type");
    }

    if (dto.fileSize > config.maxSize) {
      throw new Error("File too large");
    }
  }

  private getMediaConfig(mimeType: string) {
    return Object.values(MEDIA).find((media) =>
      media.mimeTypes.includes(mimeType),
    );
  }
}
