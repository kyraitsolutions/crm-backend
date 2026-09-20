import { IMPORT_ERROR_CODE } from "../constants/import.constant.js";
import { PermanentError } from "../errors/import-worker.errors.js";
import { assertImportMagic } from "../http/magic-bytes.js";

describe("assertImportMagic", () => {
  it("accepts XLSX PK magic", () => {
    expect(assertImportMagic(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14]))).toBe("xlsx");
  });

  it("accepts a text CSV", () => {
    expect(assertImportMagic(Buffer.from("name,phone\nAda,+9198\n"))).toBe("csv");
  });

  it("rejects NUL-filled CSV", () => {
    try {
      assertImportMagic(Buffer.alloc(32, 0));
      throw new Error("expected PermanentError");
    } catch (error) {
      expect(error).toBeInstanceOf(PermanentError);
      expect((error as PermanentError).code).toBe(IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);
    }
  });

  it("rejects OLE2 / xls", () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(() => assertImportMagic(ole)).toThrow(PermanentError);
  });
});
