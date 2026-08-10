import dotenv from "dotenv";
import { RedisOptions } from "ioredis";
dotenv.config();

export const redisConfig: RedisOptions = {
  host:
    process.env.REDIS_HOST ??
    "redis-14482.c281.us-east-1-2.ec2.redns.redis-cloud.com",

  port: Number(process.env.REDIS_PORT ?? 14482),

  password: process.env.REDIS_PASS ?? "uObO37toZgN8yO0AmkB4D73E4cpHe0MH",

  // Uncomment if your Redis provider requires TLS
  // tls: {},
};
