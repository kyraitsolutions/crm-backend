export class ImportWorkerError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable: boolean) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.retryable = retryable;
  }
}

export class TransientError extends ImportWorkerError {
  constructor(message: string, code = "IMPORT_TRANSIENT") {
    super(message, code, true);
  }
}

export class PermanentError extends ImportWorkerError {
  constructor(message: string, code = "IMPORT_PERMANENT") {
    super(message, code, false);
  }
}

export function isTransientError(error: unknown): error is TransientError {
  return error instanceof TransientError;
}

export function isPermanentError(error: unknown): error is PermanentError {
  return error instanceof PermanentError;
}
