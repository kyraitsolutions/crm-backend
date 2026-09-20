import { HttpError } from "../../../../utils/http.error.js";
import { IMPORT_ERROR_CODE, IMPORT_MAX_FILE_BYTES } from "../constants/import.constant.js";
import {
  parseCreateImportRequest,
  parseDryRunRequest,
  parseStartImportRequest,
} from "../dtos/import.dto.js";

describe("import DTOs", () => {
  it("accepts a valid create payload", () => {
    const parsed = parseCreateImportRequest({
      fileName: "contacts.csv",
      mimeType: "text/csv",
      fileSize: 1024,
    });
    expect(parsed.fileName).toBe("contacts.csv");
  });

  it("rejects oversized files with IMPORT_FILE_TOO_LARGE", () => {
    try {
      parseCreateImportRequest({
        fileName: "huge.csv",
        mimeType: "text/csv",
        fileSize: IMPORT_MAX_FILE_BYTES + 1,
      });
      throw new Error("expected HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      const httpError = error as HttpError;
      expect(httpError.code).toBe(IMPORT_ERROR_CODE.IMPORT_FILE_TOO_LARGE);
      expect(httpError.statusCode).toBe(400);
    }
  });

  it("rejects unsupported MIME with IMPORT_UNSUPPORTED_TYPE", () => {
    try {
      parseCreateImportRequest({
        fileName: "notes.pdf",
        mimeType: "application/pdf",
        fileSize: 100,
      });
      throw new Error("expected HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe(
        IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE,
      );
    }
  });

  it("accepts a start payload with defaults", () => {
    const parsed = parseStartImportRequest({
      mapping: [{ source: "Email", target: "email" }],
      defaultCountry: "IN",
    });
    expect(parsed.policy).toBe("update");
    expect(parsed.mapping[0]?.transform).toBe("none");
    expect(parsed.defaultCountry).toBe("IN");
  });

  it("requires a 2-letter defaultCountry on start", () => {
    try {
      parseStartImportRequest({
        mapping: [{ source: "Email", target: "email" }],
      });
      throw new Error("expected HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe(IMPORT_ERROR_CODE.IMPORT_DEFAULT_COUNTRY_REQUIRED);
      expect((error as HttpError).statusCode).toBe(400);
    }
  });

  it("rejects unknown start keys including defaultAssigneeId", () => {
    try {
      parseStartImportRequest({
        mapping: [{ source: "Email", target: "email" }],
        defaultCountry: "IN",
        defaultAssigneeId: "66f000000000000000000000",
      });
      throw new Error("expected HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(400);
      expect((error as HttpError).code).not.toBe(IMPORT_ERROR_CODE.IMPORT_DEFAULT_COUNTRY_REQUIRED);
    }
  });

  it("defaults dry-run sampleSize to 200 and rejects extras", () => {
    const parsed = parseDryRunRequest({
      mapping: [{ source: "Email", target: "email" }],
      defaultCountry: "in",
    });
    expect(parsed.sampleSize).toBe(200);
    expect(parsed.defaultCountry).toBe("IN");
    try {
      parseDryRunRequest({
        mapping: [{ source: "Email", target: "email" }],
        defaultCountry: "IN",
        extra: true,
      });
      throw new Error("expected HttpError");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(400);
    }
  });
});
