import { IMPORT_ERROR_CODE, IMPORT_ROW_REASON } from "../constants/import.constant.js";
import { PermanentError } from "../errors/import-worker.errors.js";
import { planChunks } from "../parser/chunker.js";
import { parseCsvStream, sniffDelimiter } from "../parser/csv-reader.js";
import { inspectFile } from "../parser/inspect-file.js";
import { createTempStore, putText } from "./test-helpers.js";

async function collect(
  text: string,
  options: Parameters<typeof parseCsvStream>[1],
) {
  const rows = [];
  for await (const row of parseCsvStream([Buffer.from(text)], options)) {
    rows.push(row);
  }
  return rows;
}

describe("CSV parser", () => {
  it("strips a UTF-8 BOM and sniffs semicolon", async () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from("name;phone\nAda;+919876543210\n");
    const rows = [];
    for await (const row of parseCsvStream([Buffer.concat([bom, body])], {
      delimiter: ";",
      skipHeader: true,
    })) {
      rows.push(row);
    }
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fields).toEqual(["Ada", "+919876543210"]);
    expect(sniffDelimiter("name;phone\nAda;+919876543210\n")).toBe(";");
  });

  it("rejects UTF-16 BOM", async () => {
    await expect(async () => {
      for await (const _row of parseCsvStream([Buffer.from([0xff, 0xfe, 0x61, 0x00])], {
        delimiter: ",",
      })) {
        void _row;
      }
    }).rejects.toBeInstanceOf(PermanentError);
  });

  it("keeps quoted newlines in a field", async () => {
    const rows = await collect('name,note\n"Ada","hello\nworld"\n', {
      delimiter: ",",
      skipHeader: true,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.fields[1]).toBe("hello\nworld");
  });

  it("allows ragged rows", async () => {
    const rows = await collect("a,b,c\n1,2\n3,4,5,6\n", {
      delimiter: ",",
      skipHeader: true,
    });
    expect(rows[0]?.fields).toEqual(["1", "2"]);
    expect(rows[1]?.fields).toEqual(["3", "4", "5", "6"]);
  });

  it("flags an oversized row", async () => {
    const rows = await collect("h\n" + "x".repeat(50) + "\n", {
      delimiter: ",",
      skipHeader: true,
      maxRowBytes: 10,
    });
    expect(rows[0]?.error?.code).toBe(IMPORT_ROW_REASON.ROW_TOO_LARGE);
  });

  it("inspects only the head and plans deterministic chunks", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      const lines = ["name,phone"];
      for (let index = 0; index < 25; index += 1) {
        lines.push(`n${index},+91987654321${index % 10}`);
      }
      await putText(store, "a.csv", `${lines.join("\n")}\n`);
      const inspected = await inspectFile(store, "a.csv");
      expect(inspected.headers).toEqual(["name", "phone"]);
      expect(inspected.sampleRows).toHaveLength(20);
      expect(inspected.kind).toBe("csv");

      const first = await planChunks(store, "a.csv", { delimiter: ",", rowsPerChunk: 10 });
      const second = await planChunks(store, "a.csv", { delimiter: ",", rowsPerChunk: 10 });
      expect(first).toEqual(second);
      expect(first).toHaveLength(3);
      expect(first[0]?.startRow).toBe(1);
      expect(first[0]?.endRow).toBe(10);
      expect(first[2]?.endRow).toBe(25);
    } finally {
      await cleanup();
    }
  });

  it("rejects an empty file and accepts header-only", async () => {
    const { store, cleanup } = await createTempStore();
    try {
      await putText(store, "empty.csv", "");
      await expect(inspectFile(store, "empty.csv")).rejects.toMatchObject({
        code: IMPORT_ERROR_CODE.IMPORT_EMPTY,
      });

      await putText(store, "header.csv", "name,phone\n");
      const inspected = await inspectFile(store, "header.csv");
      expect(inspected.headers).toEqual(["name", "phone"]);
      expect(inspected.sampleRows).toHaveLength(0);
      const chunks = await planChunks(store, "header.csv", { delimiter: "," });
      expect(chunks).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });
});
