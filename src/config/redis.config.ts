import Redis, { type RedisOptions } from "ioredis";
import { config } from "./index.js";
import logger from "../utils/logger.js";

export const redisConfig: RedisOptions = {
  host: config.redis.host ?? "",
  port: Number(config.redis.port ?? 14482),
  password: config.redis.pass ?? "",
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy() {
    return 5_000;
  },
};

let sharedClient: Redis | undefined;
let sharedSubscriber: Redis | undefined;

installRedisProcessGuards();

export function redisErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Redis error";
}

export function isRedisCapacityError(error: unknown): boolean {
  const message = redisErrorMessage(error).toLowerCase();
  return (
    message.includes("max number of clients") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("connection is closed")
  );
}

export function getSharedRedis(): Redis {
  if (!sharedClient) {
    sharedClient = createRedisConnection();
  }
  return sharedClient;
}

export function getSharedRedisSubscriber(): Redis {
  if (!sharedSubscriber) {
    sharedSubscriber = createRedisConnection();
  }
  return sharedSubscriber;
}

export function createBullClient(type: string): Redis {
  switch (type) {
    case "client":
      return getSharedRedis();
    case "subscriber":
      return getSharedRedisSubscriber();
    case "bclient":
      return createRedisConnection();
    default:
      throw new Error(`Unexpected Bull Redis connection type: ${type}`);
  }
}

function createRedisConnection(): Redis {
  const redis = new Redis(redisConfig);
  redis.on("error", (error) => {
    logger.error("Redis error", { error: redisErrorMessage(error) });
  });
  return redis;
}

function installRedisProcessGuards(): void {
  const flag = "__kyraRedisProcessGuards" as const;
  const globalState = globalThis as typeof globalThis & {
    __kyraRedisProcessGuards?: boolean;
  };
  if (globalState[flag]) {
    return;
  }
  globalState[flag] = true;
  process.on("unhandledRejection", (reason) => {
    if (isRedisCapacityError(reason)) {
      logger.error("Redis error", { error: redisErrorMessage(reason) });
      return;
    }
    logger.error("Unhandled rejection", {
      error: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
  });
  process.on("uncaughtException", (error) => {
    if (isRedisCapacityError(error)) {
      logger.error("Redis error", { error: redisErrorMessage(error) });
      return;
    }
    logger.error("Uncaught exception", { error: error.message });
    process.exit(1);
  });
}
