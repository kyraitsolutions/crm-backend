import { writeErrorPart } from "../pipeline/error-part.js";
import { createTempStore } from "./test-helpers.js";

describe("error part sanitization", () => {
  it("prefixes formula-injection characters", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const key = await writeErrorPart(store, "job1", 0, [
        {
          rowNumber: 2,
          reason: "INVALID_PHONE",
          column: "phone",
          rawValue: "=cmd|'/c calc'!A0",
          raw: ["Ada", "+1-555-0010"],
        },
      ]);
      expect(key).toBe("errors/job1/0.csv");
      const stream = await store.createReadStream(key);
      const parts: Buffer[] = [];
      for await (const chunk of stream) {
        parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const csv = Buffer.concat(parts).toString("utf8");
      expect(csv).toContain("'=cmd|'/c calc'!A0");
      expect(csv.split("\n")[1]).not.toMatch(/^[=+\-@]/);
    } finally {
      await cleanup();
    }
  });
});
