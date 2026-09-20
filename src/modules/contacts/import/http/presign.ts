import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IMPORT_MAX_FILE_BYTES, IMPORT_PRESIGN_EXPIRES_SEC } from "../constants/import.constant.js";

export interface UploadPostPolicy {
  url: string;
  fields: Record<string, string>;
  key: string;
  expiresInSec: number;
  maxBytes: number;
  conditions: Array<unknown>;
}

export interface FilePresigner {
  createUploadPost(key: string, maxBytes?: number, expiresInSec?: number): Promise<UploadPostPolicy>;
  createDownloadGet(key: string, fileName: string, expiresInSec?: number): Promise<string>;
}

export function buildUploadPostConditions(
  key: string,
  maxBytes: number,
): Array<unknown> {
  return [
    { key },
    ["content-length-range", 1, maxBytes],
  ];
}

export class LocalFilePresigner implements FilePresigner {
  async createUploadPost(
    key: string,
    maxBytes = IMPORT_MAX_FILE_BYTES,
    expiresInSec = IMPORT_PRESIGN_EXPIRES_SEC,
  ): Promise<UploadPostPolicy> {
    const conditions = buildUploadPostConditions(key, maxBytes);
    return {
      url: `local-upload://${key}`,
      fields: {
        key,
        policy: JSON.stringify({ conditions, expiration: new Date(Date.now() + expiresInSec * 1000).toISOString() }),
      },
      key,
      expiresInSec,
      maxBytes,
      conditions,
    };
  }

  async createDownloadGet(key: string, fileName: string, expiresInSec = 300): Promise<string> {
    return `local-download://${key}?filename=${encodeURIComponent(fileName)}&expires=${expiresInSec}`;
  }
}

export class S3FilePresigner implements FilePresigner {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async createUploadPost(
    key: string,
    maxBytes = IMPORT_MAX_FILE_BYTES,
    expiresInSec = IMPORT_PRESIGN_EXPIRES_SEC,
  ): Promise<UploadPostPolicy> {
    const conditions = buildUploadPostConditions(key, maxBytes);
    const posted = await createPresignedPost(this.client, {
      Bucket: this.bucket,
      Key: key,
      Conditions: conditions as Parameters<typeof createPresignedPost>[1]["Conditions"],
      Expires: expiresInSec,
    });
    return {
      url: posted.url,
      fields: posted.fields,
      key,
      expiresInSec,
      maxBytes,
      conditions,
    };
  }

  async createDownloadGet(key: string, fileName: string, expiresInSec = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
      }),
      { expiresIn: expiresInSec },
    );
  }
}
