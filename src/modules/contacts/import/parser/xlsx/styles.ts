import sax from "sax";
import type { OpenedXlsxZip } from "./zip-reader.js";
import { attributeValue, localName } from "./xml-names.js";

const BUILTIN_DATE_FMTS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57,
]);

export class StyleTable {
  constructor(private readonly dateStyleIds: Set<number>) {}

  isDateStyle(styleId: number | undefined): boolean {
    if (styleId === undefined) {
      return false;
    }
    return this.dateStyleIds.has(styleId);
  }
}

export async function loadStyles(zip: OpenedXlsxZip): Promise<StyleTable> {
  if (!zip.entries.some((entry) => entry.fileName === "xl/styles.xml")) {
    return new StyleTable(new Set());
  }
  const xml = await zip.readXml("xl/styles.xml");
  const dateFmtIds = new Set<number>(BUILTIN_DATE_FMTS);
  const dateStyleIds = new Set<number>();
  let inNumFmts = false;
  let inCellXfs = false;
  let xfIndex = 0;

  const parser = sax.parser(true, { trim: false, normalize: false });
  parser.onopentag = (node) => {
    const name = localName(node.name);
    if (name === "numFmts") {
      inNumFmts = true;
    }
    if (name === "cellXfs") {
      inCellXfs = true;
      xfIndex = 0;
    }
    if (inNumFmts && name === "numFmt") {
      const idRaw = attributeValue(node.attributes, "numFmtId");
      const format = attributeValue(node.attributes, "formatCode") ?? "";
      const id = idRaw === undefined ? Number.NaN : Number(idRaw);
      if (Number.isInteger(id) && looksLikeDateFormat(format)) {
        dateFmtIds.add(id);
      }
    }
    if (inCellXfs && name === "xf") {
      const idRaw = attributeValue(node.attributes, "numFmtId");
      const id = idRaw === undefined ? Number.NaN : Number(idRaw);
      if (Number.isInteger(id) && dateFmtIds.has(id)) {
        dateStyleIds.add(xfIndex);
      }
      xfIndex += 1;
    }
  };
  parser.onclosetag = (rawName) => {
    const name = localName(rawName);
    if (name === "numFmts") {
      inNumFmts = false;
    }
    if (name === "cellXfs") {
      inCellXfs = false;
    }
  };
  parser.write(xml.toString("utf8"));
  parser.close();
  return new StyleTable(dateStyleIds);
}

function looksLikeDateFormat(format: string): boolean {
  const cleaned = format.replace(/\[[^\]]*]/g, "").replace(/"[^"]*"/g, "");
  return /[ymdhs]/i.test(cleaned) && !/^0+\.?0*$/.test(cleaned);
}
