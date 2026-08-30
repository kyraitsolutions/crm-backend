import { RedisOptions } from "ioredis";
import { config } from "./index.js";

export const redisConfig: RedisOptions = {
  host: config.redis.host ?? "",
  port: Number(config.redis.port ?? 14482),
  password: config.redis.pass ?? "",

  // Uncomment if your Redis provider requires TLS
  // tls: {},
};
