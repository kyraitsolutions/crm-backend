export class HttpError extends Error {
  statusCode: number;
  details?: unknown;
  code?: string;

  constructor(statusCode: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }

  static badRequest(message: string, details?: unknown, code?: string): HttpError {
    return new HttpError(400, message, details, code);
  }

  static unauthorized(message: string, details?: unknown, code?: string): HttpError {
    return new HttpError(401, message, details, code);
  }

  static forbidden(message: string, details?: unknown, code?: string): HttpError {
    return new HttpError(403, message, details, code);
  }

  static paymentRequired(message: string, details?: unknown, code?: string): HttpError {
    return new HttpError(402, message, details, code);
  }

  static notFound(message: string, details?: unknown, code?: string): HttpError {
    return new HttpError(404, message, details, code);
  }

  static conflict(message: string, details?: unknown, code?: string): HttpError {
    return new HttpError(409, message, details, code);
  }

  static internal(message = "Internal server error", details?: unknown, code?: string): HttpError {
    return new HttpError(500, message, details, code);
  }
}
