import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IMPORT_ERROR_CODE } from "../constants/import.constant.js";
import { PermanentError } from "../errors/import-worker.errors.js";
import { csvLine } from "../parser/csv-format.js";
import { excelSerialToIso } from "../parser/xlsx/excel-date.js";
import { formatExcelNumber } from "../parser/xlsx/excel-number.js";
import { parseCellRef } from "../parser/xlsx/sheet-csv.js";
import { inspectFile } from "../parser/inspect-file.js";
import { convertXlsxFile, isOle2Magic, OLE2_REJECT_MESSAGE } from "../parser/xlsx-to-csv.js";
import { createTempStore, putText } from "./test-helpers.js";
import { exceljsWorkbook, sheetJsWorkbook } from "./xlsx-writers.js";
import { buildZip, sheetXml, zipStore } from "./xlsx-zip.js";

const REAL_FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../../tests/fixtures/xlsx/real",
);

const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);

async function convertBuffer(
  xlsx: Buffer,
  options: { sheetName?: string; onHeartbeat?: () => Promise<void> | void } = {},
): Promise<{ csv: string; sheetNames?: string[]; sheetName?: string; date1904?: boolean }> {
  const { store, cleanup, root } = await createTempStore();
  try {
    await putText(store, "book.xlsx", xlsx);
    const inspected = await inspectFile(store, "book.xlsx", {
      tempDir: root,
      sheetName: options.sheetName,
      onHeartbeat: options.onHeartbeat,
    });
    const stream = await store.createReadStream(inspected.sourceKey);
    const parts: Buffer[] = [];
    for await (const chunk of stream) {
      parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return {
      csv: Buffer.concat(parts).toString("utf8"),
      sheetNames: inspected.sheetNames,
      sheetName: inspected.sheetName,
      date1904: inspected.date1904,
    };
  } finally {
    await cleanup();
  }
}

async function expectReject(
  xlsx: Buffer,
  code: string,
  env: Record<string, string> = {},
): Promise<void> {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    await expect(convertBuffer(xlsx)).rejects.toMatchObject({ code });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function csvFrom(rows: string[][]): string {
  return rows.map((row) => csvLine(row)).join("");
}

describe("excel number and date helpers", () => {
  it("expands scientific notation for integer-valued phones", () => {
    expect(formatExcelNumber("9.87654321E+9")).toBe("9876543210");
    expect(formatExcelNumber("987654321012")).toBe("987654321012");
    expect(formatExcelNumber("1.5")).toBe("1.5");
  });

  it("converts 1900 and 1904 serials to ISO", () => {
    expect(excelSerialToIso(44927, false)).toBe("2023-01-01");
    expect(excelSerialToIso(43465, true)).toBe("2023-01-01");
  });

  it("parses cell references", () => {
    expect(parseCellRef("A1")).toEqual({ col: 0, row: 1 });
    expect(parseCellRef("C5")).toEqual({ col: 2, row: 5 });
    expect(parseCellRef("AA10")).toEqual({ col: 26, row: 10 });
  });
});

describe("XLSX conversion", () => {
  it("converts a minimal first sheet to canonical CSV", async () => {
    const xlsx = zipStore([
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>name</t></is></c>
      <c r="B1" t="inlineStr"><is><t>phone</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>Ada</t></is></c>
      <c r="B2" t="inlineStr"><is><t>+919876543210</t></is></c>
    </row>`),
          "utf8",
        ),
      },
    ]);
    const { csv } = await convertBuffer(xlsx);
    expect(csv).toBe(csvFrom([["name", "phone"], ["Ada", "+919876543210"]]));
  });

  it("fills sparse missing cells, skips empty rows, and concatenates rich text", async () => {
    const xlsx = zipStore([
      {
        name: "xl/sharedStrings.xml",
        data: Buffer.from(
          `<?xml version="1.0"?>
<sst>
  <si><t xml:space="preserve">  padded  </t></si>
  <si><r><t>Hel</t></r><r><t>lo</t></r><rPh><t>skip</t></rPh></si>
</sst>`,
          "utf8",
        ),
      },
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="C1" t="s"><v>1</v></c>
    </row>
    <row r="2"/>
    <row r="3">
      <c r="B3" t="inlineStr"><is><t>mid</t></is></c>
    </row>`),
          "utf8",
        ),
      },
    ]);
    const { csv } = await convertBuffer(xlsx);
    expect(csv).toBe(csvFrom([["  padded  ", "", "Hello"], ["", "mid"]]));
  });

  it("emits RFC 4180 quotes, booleans, errors, formulas, unicode, and integer phones", async () => {
    const xlsx = zipStore([
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>note</t></is></c>
      <c r="B1" t="inlineStr"><is><t>flag</t></is></c>
      <c r="C1" t="inlineStr"><is><t>phone</t></is></c>
      <c r="D1" t="inlineStr"><is><t>sum</t></is></c>
      <c r="E1" t="inlineStr"><is><t>err</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>hello, "world"
line</t></is></c>
      <c r="B2" t="b"><v>1</v></c>
      <c r="C2" t="n"><v>9.87654321E+9</v></c>
      <c r="D2"><f>1+1</f><v>2</v></c>
      <c r="E2" t="e"><v>#DIV/0!</v></c>
    </row>
    <row r="3">
      <c r="A3" t="str"><v>日本語🎉</v></c>
      <c r="B3" t="b"><v>0</v></c>
      <c r="C3" t="n"><v>987654321012</v></c>
    </row>`),
          "utf8",
        ),
      },
    ]);
    const { csv } = await convertBuffer(xlsx);
    expect(csv).toBe(
      csvFrom([
        ["note", "flag", "phone", "sum", "err"],
        ["hello, \"world\"\nline", "TRUE", "9876543210", "2", ""],
        ["日本語🎉", "FALSE", "987654321012"],
      ]),
    );
  });

  it("converts date styles for 1900 and 1904 workbooks", async () => {
    const styles = `<?xml version="1.0"?>
<styleSheet>
  <numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts>
  <cellXfs count="2">
    <xf numFmtId="0"/>
    <xf numFmtId="14"/>
  </cellXfs>
</styleSheet>`;
    const workbook = (date1904: boolean): Buffer =>
      zipStore([
        {
          name: "xl/workbook.xml",
          data: Buffer.from(
            `<?xml version="1.0"?>
<workbook>
  <workbookPr date1904="${date1904 ? "1" : "0"}"/>
  <sheets><sheet name="Dates" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
            "utf8",
          ),
        },
        {
          name: "xl/_rels/workbook.xml.rels",
          data: Buffer.from(
            `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
            "utf8",
          ),
        },
        { name: "xl/styles.xml", data: Buffer.from(styles, "utf8") },
        {
          name: "xl/worksheets/sheet1.xml",
          data: Buffer.from(
            sheetXml(`
    <row r="1"><c r="A1" t="inlineStr"><is><t>when</t></is></c></row>
    <row r="2"><c r="A2" s="1"><v>${date1904 ? "43465" : "44927"}</v></c></row>`),
            "utf8",
          ),
        },
      ]);

    const nineteen = await convertBuffer(workbook(false));
    expect(nineteen.csv).toBe(csvFrom([["when"], ["2023-01-01"]]));
    expect(nineteen.date1904).toBe(false);
    const mac = await convertBuffer(workbook(true));
    expect(mac.csv).toBe(csvFrom([["when"], ["2023-01-01"]]));
    expect(mac.date1904).toBe(true);
  });

  it("skips a hidden first sheet and records workbook metadata", async () => {
    const xlsx = zipStore([
      {
        name: "xl/workbook.xml",
        data: Buffer.from(
          `<?xml version="1.0"?>
<workbook>
  <sheets>
    <sheet name="Hidden" sheetId="1" state="hidden" r:id="rId1"/>
    <sheet name="Visible" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
          "utf8",
        ),
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        data: Buffer.from(
          `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`,
          "utf8",
        ),
      },
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`<row r="1"><c r="A1" t="inlineStr"><is><t>wrong</t></is></c></row>`),
          "utf8",
        ),
      },
      {
        name: "xl/worksheets/sheet2.xml",
        data: Buffer.from(
          sheetXml(`<row r="1"><c r="A1" t="inlineStr"><is><t>right</t></is></c></row>`),
          "utf8",
        ),
      },
    ]);
    const converted = await convertBuffer(xlsx);
    expect(converted.csv).toBe(csvFrom([["right"]]));
    expect(converted.sheetNames).toEqual(["Hidden", "Visible"]);
    expect(converted.sheetName).toBe("Visible");

    const named = await convertBuffer(xlsx, { sheetName: "Hidden" });
    expect(named.csv).toBe(csvFrom([["wrong"]]));
    expect(named.sheetName).toBe("Hidden");
  });

  it("converts the same logical grid from exceljs and SheetJS", async () => {
    const rows: Array<Array<string | number | boolean | Date>> = [
      ["name", "phone", "flag", "when"],
      ["Ada", 9876543210, true, new Date(Date.UTC(2023, 0, 15))],
      ["Bo", 987654321012, false, new Date(Date.UTC(2024, 5, 1))],
    ];
    const excel = await exceljsWorkbook((workbook) => {
      const sheet = workbook.addWorksheet("People");
      sheet.addRow(rows[0]);
      const ada = sheet.addRow(rows[1]);
      ada.getCell(4).numFmt = "yyyy-mm-dd";
      const bo = sheet.addRow(rows[2]);
      bo.getCell(4).numFmt = "yyyy-mm-dd";
    });
    const sheetjs = sheetJsWorkbook([{ name: "People", rows }]);
    const fromExcel = await convertBuffer(excel);
    const fromSheet = await convertBuffer(sheetjs);
    expect(fromExcel.csv.split("\n")[0]).toBe("name,phone,flag,when");
    expect(fromExcel.csv).toContain("Ada,9876543210,TRUE,2023-01-15");
    expect(fromExcel.csv).toContain("Bo,987654321012,FALSE,2024-06-01");
    expect(fromSheet.csv).toContain("Ada,9876543210,TRUE,2023-01-15");
    expect(fromSheet.csv).toContain("Bo,987654321012,FALSE,2024-06-01");
  });

  it("writes byte-identical output across two conversions", async () => {
    const xlsx = await exceljsWorkbook((workbook) => {
      const sheet = workbook.addWorksheet("Sheet1");
      sheet.addRow(["name", "note"]);
      sheet.addRow(["Ada", 'said "hi",\nthen left']);
    });
    const first = await convertBuffer(xlsx);
    const second = await convertBuffer(xlsx);
    expect(createHash("sha256").update(first.csv).digest("hex")).toBe(
      createHash("sha256").update(second.csv).digest("hex"),
    );
  });

  it("rejects OLE2 / .xls with a typed message", async () => {
    expect(isOle2Magic(OLE2)).toBe(true);
    const { store, cleanup } = await createTempStore();
    try {
      await putText(store, "legacy.xls", OLE2);
      await expect(inspectFile(store, "legacy.xls")).rejects.toMatchObject({
        code: IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
        message: OLE2_REJECT_MESSAGE,
      });
    } finally {
      await cleanup();
    }
  });

  it("rejects encrypted packages", async () => {
    const xlsx = zipStore([
      { name: "EncryptedPackage", data: Buffer.from("secret") },
      { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml(""), "utf8") },
    ]);
    await expectReject(xlsx, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
  });

  it("rejects a corrupted zip", async () => {
    const { store, cleanup, root } = await createTempStore();
    try {
      await putText(store, "bad.xlsx", Buffer.from("PK\u0003\u0004not-a-zip"));
      await expect(inspectFile(store, "bad.xlsx", { tempDir: root })).rejects.toBeInstanceOf(
        PermanentError,
      );
    } finally {
      await cleanup();
    }
  });

  it("rejects DOCTYPE and ENTITY declarations", async () => {
    const doctype = zipStore([
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          `<?xml version="1.0"?><!DOCTYPE worksheet><worksheet><sheetData/></worksheet>`,
          "utf8",
        ),
      },
    ]);
    const entity = zipStore([
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          `<?xml version="1.0"?><!ENTITY xxe SYSTEM "file:///etc/passwd"><worksheet><sheetData/></worksheet>`,
          "utf8",
        ),
      },
    ]);
    await expectReject(doctype, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
    await expectReject(entity, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
  });

  it("rejects too many rows and columns", async () => {
    const rows = zipStore([
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`
    <row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>b</t></is></c></row>
    <row r="3"><c r="A3" t="inlineStr"><is><t>c</t></is></c></row>
    <row r="4"><c r="A4" t="inlineStr"><is><t>d</t></is></c></row>`),
          "utf8",
        ),
      },
    ]);
    await expectReject(rows, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE, {
      IMPORT_MAX_XLSX_ROWS: "2",
    });

    const cols = zipStore([
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>a</t></is></c>
      <c r="B1" t="inlineStr"><is><t>b</t></is></c>
      <c r="C1" t="inlineStr"><is><t>c</t></is></c>
    </row>`),
          "utf8",
        ),
      },
    ]);
    await expectReject(cols, IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE, {
      IMPORT_MAX_COLUMNS: "2",
    });
  });

  it("rejects a shared-strings cap with a CSV message", async () => {
    const xlsx = zipStore([
      {
        name: "xl/sharedStrings.xml",
        data: Buffer.from(
          `<?xml version="1.0"?><sst><si><t>${"x".repeat(80)}</t></si></sst>`,
          "utf8",
        ),
      },
      {
        name: "xl/worksheets/sheet1.xml",
        data: Buffer.from(
          sheetXml(`<row r="1"><c r="A1" t="s"><v>0</v></c></row>`),
          "utf8",
        ),
      },
    ]);
    const previous = process.env.IMPORT_MAX_SHARED_STRINGS_BYTES;
    process.env.IMPORT_MAX_SHARED_STRINGS_BYTES = "20";
    try {
      await expect(convertBuffer(xlsx)).rejects.toMatchObject({
        code: IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB,
        message: expect.stringMatching(/CSV instead/i) as unknown,
      });
    } finally {
      if (previous === undefined) {
        delete process.env.IMPORT_MAX_SHARED_STRINGS_BYTES;
      } else {
        process.env.IMPORT_MAX_SHARED_STRINGS_BYTES = previous;
      }
    }
  });

  it("rejects a zip bomb by entry count", async () => {
    const files = Array.from({ length: 65 }, (_, index) => ({
      name: `pad/${index}.txt`,
      data: Buffer.from("x"),
    }));
    await expectReject(zipStore(files), IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB);
  });

  it("rejects when actual uncompressed bytes exceed the declared size", async () => {
    const data = Buffer.from(
      sheetXml(`<row r="1"><c r="A1" t="inlineStr"><is><t>boom</t></is></c></row>`),
      "utf8",
    );
    const xlsx = buildZip([
      {
        name: "xl/worksheets/sheet1.xml",
        data,
        method: "store",
        uncompressedSize: 16,
      },
    ]);
    await expectReject(xlsx, IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB);
  });

  it("rejects when the compression ratio exceeds a low env cap", async () => {
    const zeros = Buffer.alloc(80_000, 0);
    const xlsx = buildZip([
      { name: "xl/worksheets/sheet1.xml", data: zeros, method: "deflate" },
    ]);
    await expectReject(xlsx, IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB, { IMPORT_MAX_XLSX_RATIO: "5" });
  });

  it("refreshes heartbeat during a long conversion", async () => {
    const cells = Array.from({ length: 2_400 }, (_, index) => {
      return `<row r="${index + 1}"><c r="A${index + 1}" t="inlineStr"><is><t>r${index}</t></is></c></row>`;
    }).join("");
    const xlsx = zipStore([
      { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml(cells), "utf8") },
    ]);
    let beats = 0;
    await convertBuffer(xlsx, {
      onHeartbeat: () => {
        beats += 1;
      },
    });
    expect(beats).toBeGreaterThan(0);
  });
});

describe("real XLSX fixtures", () => {
  const listed = readdir(REAL_FIXTURE_DIR)
    .then((names) => names.filter((name) => name !== ".gitkeep"))
    .catch(() => [] as string[]);

  it("runs convert over every file in tests/fixtures/xlsx/real/", async () => {
    const names = await listed;
    for (const name of names) {
      const xlsx = await readFile(path.join(REAL_FIXTURE_DIR, name));
      const { csv } = await convertBuffer(xlsx);
      expect(csv.length).toBeGreaterThan(0);
    }
  });
});
