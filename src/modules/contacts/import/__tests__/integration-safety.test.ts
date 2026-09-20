import {
  assertSafeIntegrationTargets,
  isLocalUrl,
  newIntegrationRunIds,
} from "./integration-safety.js";

describe("integration safety", () => {
  it("accepts loopback Redis and S3 URLs", () => {
    expect(isLocalUrl("redis://127.0.0.1:16379")).toBe(true);
    expect(isLocalUrl("http://localhost:19000")).toBe(true);
    expect(isLocalUrl("http://minio:9000")).toBe(true);
    expect(isLocalUrl("redis://redis:6379")).toBe(true);
  });

  it("rejects remote hosts unless IMPORT_TEST_ALLOW_REMOTE=1", () => {
    expect(isLocalUrl("redis://redis.example.com:6379")).toBe(false);
    expect(() =>
      assertSafeIntegrationTargets({
        REDIS_URL: "redis://cache.prod.example:6379",
      }),
    ).toThrow(/not local/);
    expect(() =>
      assertSafeIntegrationTargets({
        REDIS_URL: "redis://cache.prod.example:6379",
        IMPORT_TEST_ALLOW_REMOTE: "1",
      }),
    ).not.toThrow();
  });

  it("issues unique Bull and S3 prefixes that are not the production queue", () => {
    const ids = newIntegrationRunIds();
    expect(ids.queueName.startsWith("ci-import-")).toBe(true);
    expect(ids.bullPrefix.startsWith("bull-ci-")).toBe(true);
    expect(ids.s3Prefix.startsWith("test-runs/")).toBe(true);
    expect(ids.queueName).not.toBe("contact-import");
    expect(ids.bullPrefix).not.toBe("bull");
  });
});
