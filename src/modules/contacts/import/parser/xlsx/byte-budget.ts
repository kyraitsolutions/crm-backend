import { Transform, type TransformCallback } from "node:stream";
import { IMPORT_ERROR_CODE } from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";

export interface ZipByteBudget {
  totalUsed: number;
  totalMax: number;
  ratioMax: number;
}

export class CountingLimit extends Transform {
  private used = 0;

  constructor(
    private readonly entryMax: number,
    private readonly budget: ZipByteBudget,
    private readonly compressedSize: number,
    private readonly declaredUncompressed = 0,
  ) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.used += chunk.length;
    this.budget.totalUsed += chunk.length;
    if (
      this.used > this.entryMax ||
      this.budget.totalUsed > this.budget.totalMax ||
      (this.declaredUncompressed > 0 && this.used > this.declaredUncompressed)
    ) {
      callback(
        new PermanentError(
          "XLSX uncompressed size exceeds cap",
          IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB,
        ),
      );
      return;
    }
    const compressed = Math.max(this.compressedSize, 1);
    if (this.used / compressed > this.budget.ratioMax) {
      callback(
        new PermanentError(
          "XLSX compression ratio exceeds cap",
          IMPORT_ERROR_CODE.IMPORT_ZIP_BOMB,
        ),
      );
      return;
    }
    callback(null, chunk);
  }
}
