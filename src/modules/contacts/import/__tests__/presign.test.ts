import { config } from "../../../../config/index.js";
import { IMPORT_MAX_FILE_BYTES, IMPORT_PRESIGN_EXPIRES_SEC } from "../constants/import.constant.js";
import { buildUploadPostConditions, LocalFilePresigner } from "../http/presign.js";

describe("presign policy", () => {
  it("requires the exact key, content-length-range, and 15 minute expiry", async () => {
    const key = "uploads/org/acc/job/source.csv";
    const conditions = buildUploadPostConditions(key, IMPORT_MAX_FILE_BYTES);
    expect(conditions).toEqual([
      { key },
      ["content-length-range", 1, IMPORT_MAX_FILE_BYTES],
    ]);
    const posted = await new LocalFilePresigner().createUploadPost(key);
    expect(posted.key).toBe(key);
    expect(posted.expiresInSec).toBe(IMPORT_PRESIGN_EXPIRES_SEC);
    expect(posted.maxBytes).toBe(IMPORT_MAX_FILE_BYTES);
    expect(posted.conditions).toEqual(conditions);
    const policy = JSON.parse(posted.fields.policy) as { expiration: string };
    const remainingMs = new Date(policy.expiration).getTime() - Date.now();
    expect(remainingMs).toBeGreaterThan(14 * 60 * 1000);
    expect(remainingMs).toBeLessThanOrEqual(15 * 60 * 1000);
  });
});

const minioEnabled = Boolean(process.env.MINIO_ENDPOINT ?? process.env.AWS_S3_ENDPOINT);
const describeMinio = minioEnabled ? describe : describe.skip;

describeMinio("MinIO presigned POST policy", () => {
  it("rejects an oversize upload", async () => {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const { createPresignedPost } = await import("@aws-sdk/s3-presigned-post");
    const endpoint = process.env.MINIO_ENDPOINT ?? process.env.AWS_S3_ENDPOINT;
    const bucket = process.env.AWS_S3_BUCKET ?? "contact-import-test";
    const client = new S3Client({
      region: config.aws.s3Region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "minioadmin",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "minioadmin",
      },
    });
    const key = `oversize-policy/${Date.now()}.csv`;
    const posted = await createPresignedPost(client, {
      Bucket: bucket,
      Key: key,
      Conditions: [
        { key },
        ["content-length-range", 1, 32],
      ],
      Expires: 120,
    });
    const body = new FormData();
    for (const [name, value] of Object.entries(posted.fields)) {
      body.append(name, value);
    }
    body.append("file", new Blob([Buffer.alloc(64, 65)]), "too-big.csv");
    const response = await fetch(posted.url, { method: "POST", body });
    expect(response.ok).toBe(false);
  });
});
