import winston from "winston";
import path from "path";

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define different log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "warn",
  levels,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple(),
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
    }),
  ],
});

// Create a stream object with a 'write' function that will be used by morgan
// Using a type assertion to avoid TypeScript errors since winston's Logger type
// doesn't include a 'stream' property used by morgan.
(logger as any).stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export const logError = (
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>,
): void => {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(scope, {
    message: err.message,
    stack: err.stack,
    ...meta,
  });
};

export { logger };
export default logger;
