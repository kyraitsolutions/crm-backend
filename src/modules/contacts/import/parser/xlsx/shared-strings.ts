import sax from "sax";
import { IMPORT_ERROR_CODE, xlsxSharedStringsLimit } from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";
import type { OpenedXlsxZip } from "./zip-reader.js";
import { localName } from "./xml-names.js";

export class SharedStringTable {
  constructor(
    private readonly buffer: Buffer,
    private readonly offsets: Uint32Array,
  ) {}

  get size(): number {
    return Math.max(0, this.offsets.length - 1);
  }

  get(index: number): string {
    if (!Number.isInteger(index) || index < 0 || index >= this.size) {
      return "";
    }
    return this.buffer.subarray(this.offsets[index], this.offsets[index + 1]).toString("utf8");
  }
}

export async function loadSharedStrings(zip: OpenedXlsxZip): Promise<SharedStringTable> {
  const has = zip.entries.some((entry) => entry.fileName === "xl/sharedStrings.xml");
  if (!has) {
    return new SharedStringTable(Buffer.alloc(0), new Uint32Array([0]));
  }
  const stream = await zip.streamXml("xl/sharedStrings.xml");
  const chunks: Buffer[] = [];
  let byteLength = 0;
  const starts: number[] = [0];
  let inText = false;
  let inPhonetic = false;
  let current: Buffer[] = [];
  const cap = xlsxSharedStringsLimit();

  const parser = sax.parser(true, { trim: false, normalize: false });
  parser.onopentag = (node) => {
    const name = localName(node.name);
    if (name === "rPh") {
      inPhonetic = true;
    }
    if (name === "t" && !inPhonetic) {
      inText = true;
    }
  };
  parser.ontext = (text) => {
    if (!inText || inPhonetic) {
      return;
    }
    const piece = Buffer.from(text, "utf8");
    current.push(piece);
    byteLength += piece.length;
    if (byteLength > cap) {
      throw new PermanentError(
        "XLSX shared strings exceed cap. Please upload a CSV instead.",
        IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB,
      );
    }
  };
  parser.onclosetag = (rawName) => {
    const name = localName(rawName);
    if (name === "t") {
      inText = false;
    }
    if (name === "rPh") {
      inPhonetic = false;
    }
    if (name === "si") {
      if (current.length > 0) {
        chunks.push(...current);
      }
      starts.push(byteLength);
      current = [];
    }
  };

  for await (const chunk of stream) {
    parser.write(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
  }
  parser.close();
  return new SharedStringTable(Buffer.concat(chunks), Uint32Array.from(starts));
}
