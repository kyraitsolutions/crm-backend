import { PermanentError, TransientError } from "../errors/import-worker.errors.js";
import { classifyS3Error } from "../store/s3-file-store.js";

function awsError(name: string, status: number): Error {
  return Object.assign(new Error(name), {
    name,
    Code: name,
    $metadata: { httpStatusCode: status },
  });
}

describe("classifyS3Error", () => {
  it("maps NoSuchKey and 404 to PermanentError", () => {
    const missing = classifyS3Error(awsError("NoSuchKey", 404), "k");
    expect(missing).toBeInstanceOf(PermanentError);
    expect((missing as PermanentError).code).toBe("IMPORT_NOT_FOUND");
  });

  it("maps AccessDenied and 403 to PermanentError", () => {
    const denied = classifyS3Error(awsError("AccessDenied", 403), "k");
    expect(denied).toBeInstanceOf(PermanentError);
    expect((denied as PermanentError).code).toBe("IMPORT_S3_FORBIDDEN");
  });

  it("maps 5xx, throttle, and timeout to TransientError", () => {
    expect(classifyS3Error(awsError("ServiceUnavailable", 503), "k")).toBeInstanceOf(
      TransientError,
    );
    expect(classifyS3Error(awsError("InternalError", 500), "k")).toBeInstanceOf(TransientError);
    expect(classifyS3Error(awsError("SlowDown", 503), "k")).toBeInstanceOf(TransientError);
    expect(classifyS3Error(awsError("Throttling", 429), "k")).toBeInstanceOf(TransientError);
    expect(classifyS3Error(awsError("TimeoutError", 0), "k")).toBeInstanceOf(TransientError);
  });
});
