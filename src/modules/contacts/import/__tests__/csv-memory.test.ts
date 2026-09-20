import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { planChunks } from "../parser/chunker.js";
import { createTempStore } from "./test-helpers.js";

const ROW_COUNT = 300_000;
const HEAP_BOUND_BYTES = 80 * 1024 * 1024;

describe("CSV stream memory", () => {
  it("keeps heap growth bounded while planning 300k rows", async () => {
    if (typeof globalThis.gc !== "function") {
      throw new Error("Memory test requires --expose-gc");
    }
    const { store, cleanup } = await createTempStore();
    try {
      const filePath = store.resolvePath("big.csv");
      let index = 0;
      await pipeline(
        new Readable({
          read() {
            if (index === 0) {
              this.push("name,phone,email\n");
            }
            const batch: string[] = [];
            for (let count = 0; count < 1000 && index < ROW_COUNT; count += 1) {
              batch.push(`N${index},+9198765${String(10000 + (index % 80000)).slice(1)},u${index}@k.test\n`);
              index += 1;
            }
            this.push(batch.join(""));
            if (index >= ROW_COUNT) {
              this.push(null);
            }
          },
        }),
        createWriteStream(filePath),
      );

      globalThis.gc();
      const before = process.memoryUsage().heapUsed;
      const descriptors = await planChunks(store, "big.csv", {
        delimiter: ",",
        rowsPerChunk: 1000,
      });
      globalThis.gc();
      const after = process.memoryUsage().heapUsed;
      expect(descriptors.length).toBe(300);
      expect(descriptors[0]?.startRow).toBe(1);
      expect(descriptors[299]?.endRow).toBe(ROW_COUNT);
      expect(after - before).toBeLessThan(HEAP_BOUND_BYTES);
    } finally {
      await cleanup();
    }
  }, 180_000);
});
