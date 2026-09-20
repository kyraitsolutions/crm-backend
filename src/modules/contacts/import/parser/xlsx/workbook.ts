import sax from "sax";
import { IMPORT_ERROR_CODE } from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";
import type { OpenedXlsxZip } from "./zip-reader.js";
import { attributeValue, localName } from "./xml-names.js";

export interface WorkbookSheet {
  name: string;
  path: string;
  hidden: boolean;
}

export interface WorkbookInfo {
  sheets: WorkbookSheet[];
  date1904: boolean;
}

export async function loadWorkbook(zip: OpenedXlsxZip): Promise<WorkbookInfo> {
  if (!zip.entries.some((entry) => entry.fileName === "xl/workbook.xml")) {
    return fallbackWorkbook(zip);
  }
  const workbookXml = await zip.readXml("xl/workbook.xml");
  const rels = zip.entries.some((entry) => entry.fileName === "xl/_rels/workbook.xml.rels")
    ? await parseRels(await zip.readXml("xl/_rels/workbook.xml.rels"))
    : new Map<string, string>();

  let date1904 = false;
  const sheets: WorkbookSheet[] = [];
  const parser = sax.parser(true, { trim: false, normalize: false });
  parser.onopentag = (node) => {
    const name = localName(node.name);
    if (name === "workbookPr") {
      const raw = attributeValue(node.attributes, "date1904");
      date1904 = raw === "1" || raw === "true";
    }
    if (name === "sheet") {
      const sheetName = attributeValue(node.attributes, "name") ?? `Sheet${sheets.length + 1}`;
      const relId = attributeValue(node.attributes, "id");
      const state = attributeValue(node.attributes, "state") ?? "visible";
      const target = relId ? rels.get(relId) : undefined;
      const path = target ? normalizeSheetPath(target) : undefined;
      if (path) {
        sheets.push({
          name: sheetName,
          path,
          hidden: state === "hidden" || state === "veryHidden",
        });
      }
    }
  };
  parser.write(workbookXml.toString("utf8"));
  parser.close();
  if (sheets.length === 0) {
    return fallbackWorkbook(zip);
  }
  return { sheets, date1904 };
}

export function chooseSheet(info: WorkbookInfo, sheetName?: string): WorkbookSheet {
  if (sheetName) {
    const named = info.sheets.find((sheet) => sheet.name === sheetName);
    if (!named) {
      throw new PermanentError(
        `XLSX has no sheet named ${sheetName}`,
        IMPORT_ERROR_CODE.IMPORT_EMPTY,
      );
    }
    return named;
  }
  const visible = info.sheets.find((sheet) => !sheet.hidden);
  if (!visible) {
    throw new PermanentError("XLSX has no visible worksheet", IMPORT_ERROR_CODE.IMPORT_EMPTY);
  }
  return visible;
}

function fallbackWorkbook(zip: OpenedXlsxZip): WorkbookInfo {
  const paths = zip.entries
    .map((entry) => entry.fileName)
    .filter((name) => name.startsWith("xl/worksheets/") && name.endsWith(".xml"))
    .sort();
  return {
    date1904: false,
    sheets: paths.map((path, index) => ({
      name: `Sheet${index + 1}`,
      path,
      hidden: false,
    })),
  };
}

async function parseRels(xml: Buffer): Promise<Map<string, string>> {
  const rels = new Map<string, string>();
  const parser = sax.parser(true, { trim: false, normalize: false });
  parser.onopentag = (node) => {
    if (localName(node.name) !== "Relationship") {
      return;
    }
    const id = attributeValue(node.attributes, "Id");
    const target = attributeValue(node.attributes, "Target");
    const type = attributeValue(node.attributes, "Type") ?? "";
    if (id && target && type.includes("worksheet")) {
      rels.set(id, target);
    }
  };
  parser.write(xml.toString("utf8"));
  parser.close();
  return rels;
}

function normalizeSheetPath(target: string): string {
  const trimmed = target.replace(/\\/g, "/").replace(/^\//, "");
  if (trimmed.startsWith("xl/")) {
    return trimmed;
  }
  return `xl/${trimmed.replace(/^\.\//, "")}`;
}
