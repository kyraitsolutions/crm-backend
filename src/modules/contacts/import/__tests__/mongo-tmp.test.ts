import os from "node:os";
import { resolveMongoTmpDir } from "./mongo-test-env.js";

describe("resolveMongoTmpDir", () => {
  const previous = process.env.IMPORT_MONGO_TMP;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.IMPORT_MONGO_TMP;
    } else {
      process.env.IMPORT_MONGO_TMP = previous;
    }
  });

  it("defaults to os.tmpdir() when IMPORT_MONGO_TMP is unset", () => {
    delete process.env.IMPORT_MONGO_TMP;
    expect(resolveMongoTmpDir({})).toBe(os.tmpdir());
    expect(resolveMongoTmpDir({ ...process.env, IMPORT_MONGO_TMP: "" })).toBe(os.tmpdir());
  });

  it("uses IMPORT_MONGO_TMP when set", () => {
    expect(resolveMongoTmpDir({ IMPORT_MONGO_TMP: "/custom/import-mongo" })).toBe(
      "/custom/import-mongo",
    );
  });
});
