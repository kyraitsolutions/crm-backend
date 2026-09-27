import { Transform, type TransformCallback } from "node:stream";
import { IMPORT_ERROR_CODE } from "../../constants/import.constant.js";
import { PermanentError } from "../../errors/import-worker.errors.js";

const FORBIDDEN = /<!DOCTYPE|<!ENTITY/i;

export class XmlSecurityGuard extends Transform {
  private tail = "";

  constructor() {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    const text = chunk.toString("utf8");
    const window = `${this.tail}${text}`;
    if (FORBIDDEN.test(window)) {
      callback(
        new PermanentError(
          "XLSX XML contains DOCTYPE or ENTITY declarations",
          IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
        ),
      );
      return;
    }
    this.tail = window.slice(-16);
    callback(null, chunk);
  }
}
