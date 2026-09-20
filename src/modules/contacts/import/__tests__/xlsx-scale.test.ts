import { createReadStream } from "node:fs";
import path from "node:path";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { IMPORT_CHUNK_ROWS } from "../constants/import.constant.js";
import { planChunks } from "../parser/chunker.js";
import { convertXlsxFile } from "../parser/xlsx-to-csv.js";
import { createTempStore } from "./test-helpers.js";
import { writeStreamingXlsx } from "./xlsx-writers.js";

const SCALE_ROWS = 500_000;
const HEAP_GROWTH_BOUND = 128 * 1024 * 1024;
const EVENT_LOOP_P99_SOFT_MS = 100;
const EVENT_LOOP_P99_HARD_MS = 250;

function collectGc(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (gc) {
    gc();
  }
}

describe("XLSX streaming scale", () => {
  it(
    "converts 500k x 6 under a heap bound and plans the expected chunks",
    async () => {
      const { store, root, cleanup } = await createTempStore();
      try {
        const xlsxPath = path.join(root, "scale.xlsx");
        const csvPath = path.join(root, "scale.csv");
        await writeStreamingXlsx(
          xlsxPath,
          ["c0", "c1", "c2", "c3", "c4", "c5"],
          function* () {
            for (let index = 0; index < SCALE_ROWS; index += 1) {
              yield [
                `r${index}`,
                index,
                `u${index}@t.example`,
                9_876_500_000 + index,
                index % 2 === 0,
                `n${index}`,
              ];
            }
          },
        );

        collectGc();
        const before = process.memoryUsage();
        const histogram = monitorEventLoopDelay({ resolution: 20 });
        histogram.enable();
        const started = process.hrtime.bigint();
        const converted = await convertXlsxFile(xlsxPath, csvPath);
        const elapsedNs = process.hrtime.bigint() - started;
        histogram.disable();
        collectGc();
        const after = process.memoryUsage();

        const elapsedSec = Number(elapsedNs) / 1e9;
        const rowsPerSec = converted.rowsEmitted / elapsedSec;
        const heapGrowth = after.heapUsed - before.heapUsed;
        const peakRss = Math.max(before.rss, after.rss);
        const p99Ms = histogram.percentile(99) / 1e6;

        console.log(
          `XLSX_SCALE rows=${converted.rowsEmitted} rows/sec=${rowsPerSec.toFixed(1)} heapGrowthMB=${(heapGrowth / (1024 * 1024)).toFixed(1)} peakRssMB=${(peakRss / (1024 * 1024)).toFixed(1)} eventLoopP99ms=${p99Ms.toFixed(1)}`,
        );

        expect(converted.rowsEmitted).toBe(SCALE_ROWS + 1);
        expect(heapGrowth).toBeLessThan(HEAP_GROWTH_BOUND);
        if (p99Ms > EVENT_LOOP_P99_SOFT_MS) {
          console.warn(
            `XLSX_SCALE event-loop p99 ${p99Ms.toFixed(1)}ms exceeded the ${EVENT_LOOP_P99_SOFT_MS}ms soft bound`,
          );
        }
        expect(p99Ms).toBeLessThan(EVENT_LOOP_P99_HARD_MS);

        await store.putStream("scale.csv", createReadStream(csvPath));
        const chunks = await planChunks(store, "scale.csv", { delimiter: "," });
        expect(chunks).toHaveLength(Math.ceil(SCALE_ROWS / IMPORT_CHUNK_ROWS));
        expect(chunks[0]?.startRow).toBe(1);
        expect(chunks[chunks.length - 1]?.endRow).toBe(SCALE_ROWS);
      } finally {
        await cleanup();
      }
    },
    600_000,
  );
});
