import dotenv from "dotenv";
import Redis from "ioredis";
import logger from "../utils/logger";

dotenv.config();

class RedisClient {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis(
      process.env.REDIS_HOST ||
        "redis-14482.c281.us-east-1-2.ec2.redns.redis-cloud.com",
      {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
        lazyConnect: true,
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on("connect", () => {
      this.isConnected = true;
      logger.info("Redis client connected");
    });

    this.client.on("ready", () => {
      logger.info("Redis client ready");
    });

    this.client.on("error", (error) => {
      this.isConnected = false;
      logger.error("Redis client error:", error);
    });

    this.client.on("close", () => {
      this.isConnected = false;
      logger.warn("Redis client connection closed");
    });

    this.client.on("reconnecting", () => {
      logger.info("Redis client reconnecting...");
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.client.disconnect();
      this.isConnected = false;
      logger.info("Redis client disconnected");
    } catch (error) {
      logger.error("Error disconnecting Redis client:", error);
      throw error;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }

  // Cache methods
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error(`Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Error getting cache key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting cache key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking cache key ${key}:`, error);
      throw error;
    }
  }

  // Session methods
  async setSession(
    sessionId: string,
    sessionData: any,
    ttl: number = 3600
  ): Promise<void> {
    await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async getSession(sessionId: string): Promise<any> {
    return await this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting methods
  async incrementRateLimit(key: string, windowMs: number): Promise<number> {
    try {
      const pipeline = this.client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      const results = await pipeline.exec();
      return (results?.[0]?.[1] as number) || 0;
    } catch (error) {
      logger.error(`Error incrementing rate limit for ${key}:`, error);
      throw error;
    }
  }

  // Pub/Sub methods
  async publish(channel: string, message: any): Promise<void> {
    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error(`Error publishing to channel ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(
    channel: string,
    callback: (message: any) => void
  ): Promise<void> {
    try {
      await this.client.subscribe(channel);
      this.client.on("message", (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(JSON.parse(message));
        }
      });
    } catch (error) {
      logger.error(`Error subscribing to channel ${channel}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

export { redisClient };
export default redisClient;
