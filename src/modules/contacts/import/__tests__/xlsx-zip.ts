import { crc32, deflateRawSync } from "node:zlib";

export interface ZipFileSpec {
  name: string;
  data: Buffer;
  method?: "store" | "deflate";
  uncompressedSize?: number;
  compressedSize?: number;
}

export function buildZip(files: ZipFileSpec[]): Buffer {
  const parts: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const method = file.method === "deflate" ? 8 : 0;
    const payload = method === 8 ? deflateRawSync(file.data) : file.data;
    const crc = Number(crc32(file.data));
    const compressedSize = file.compressedSize ?? payload.length;
    const uncompressedSize = file.uncompressedSize ?? file.data.length;

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc >>> 0, 14);
    local.writeUInt32LE(compressedSize, 18);
    local.writeUInt32LE(uncompressedSize, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    parts.push(local, payload);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 8);
    central.writeUInt32LE(crc >>> 0, 16);
    central.writeUInt32LE(compressedSize, 20);
    central.writeUInt32LE(uncompressedSize, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + payload.length;
  }
  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralDir, eocd]);
}

export function zipStore(files: Array<{ name: string; data: Buffer }>): Buffer {
  return buildZip(files.map((file) => ({ ...file, method: "store" })));
}

export function sheetXml(rows: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
${rows}
  </sheetData>
</worksheet>`;
}
