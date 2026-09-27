import {
  IMPORT_CHUNK_MAX_BYTES,
  IMPORT_CHUNK_ROWS,
} from "../constants/import.constant.js";
import type { FileStore } from "../store/file-store.js";
import type { ImportChunkDescriptor } from "../types/import.types.js";
import { parseCsvStream, type CsvDelimiter } from "./csv-reader.js";

export interface PlanChunksOptions {
  delimiter: CsvDelimiter;
  rowsPerChunk?: number;
  maxChunkBytes?: number;
}

export async function planChunks(
  store: FileStore,
  key: string,
  options: PlanChunksOptions,
): Promise<ImportChunkDescriptor[]> {
  const rowsPerChunk = options.rowsPerChunk ?? IMPORT_CHUNK_ROWS;
  const maxChunkBytes = options.maxChunkBytes ?? IMPORT_CHUNK_MAX_BYTES;
  const stream = await store.createReadStream(key);
  const descriptors: ImportChunkDescriptor[] = [];

  let index = 0;
  let startRow = 0;
  let startByte = 0;
  let lastEndRow = 0;
  let lastEndByte = 0;
  let rowsInChunk = 0;

  const flush = (): void => {
    if (rowsInChunk === 0 || startRow === 0) {
      return;
    }
    descriptors.push({
      index,
      startRow,
      endRow: lastEndRow,
      byteOffsetStart: startByte,
      byteOffsetEnd: lastEndByte,
    });
    index += 1;
    rowsInChunk = 0;
    startRow = 0;
  };

  for await (const row of parseCsvStream(stream, {
    delimiter: options.delimiter,
    skipHeader: true,
    firstRowNumber: 1,
  })) {
    if (rowsInChunk === 0) {
      startRow = row.rowNumber;
      startByte = row.startByte;
    }
    const chunkBytes = row.endByte - startByte;
    if (rowsInChunk > 0 && (rowsInChunk >= rowsPerChunk || chunkBytes > maxChunkBytes)) {
      flush();
      startRow = row.rowNumber;
      startByte = row.startByte;
      rowsInChunk = 0;
    }
    lastEndRow = row.rowNumber;
    lastEndByte = row.endByte;
    rowsInChunk += 1;
  }

  flush();
  return descriptors;
}

export async function readChunkRows(
  store: FileStore,
  key: string,
  descriptor: ImportChunkDescriptor,
  delimiter: CsvDelimiter,
): Promise<Array<{ rowNumber: number; fields: string[]; error?: { code: string } }>> {
  if (descriptor.byteOffsetEnd <= descriptor.byteOffsetStart) {
    return [];
  }
  const stream = await store.createReadStream(key, {
    start: descriptor.byteOffsetStart,
    end: descriptor.byteOffsetEnd - 1,
  });
  const rows: Array<{ rowNumber: number; fields: string[]; error?: { code: string } }> = [];
  try {
    for await (const row of parseCsvStream(stream, {
      delimiter,
      skipHeader: false,
      firstRowNumber: descriptor.startRow,
      startByte: descriptor.byteOffsetStart,
    })) {
      rows.push({
        rowNumber: row.rowNumber,
        fields: row.fields,
        error: row.error,
      });
      if (row.rowNumber >= descriptor.endRow) {
        break;
      }
    }
  } finally {
    stream.destroy();
  }
  return rows;
}
