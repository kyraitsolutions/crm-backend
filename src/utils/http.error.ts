export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, details);
  }

  static unauthorized(message: string, details?: unknown): HttpError {
    return new HttpError(401, message, details);
  }

  static forbidden(message: string, details?: unknown): HttpError {
    return new HttpError(403, message, details);
  }

  static notFound(message: string, details?: unknown): HttpError {
    return new HttpError(404, message, details);
  }

  static conflict(message: string, details?: unknown): HttpError {
    return new HttpError(409, message, details);
  }

  static internal(message = "Internal server error", details?: unknown): HttpError {
    return new HttpError(500, message, details);
  }
}
