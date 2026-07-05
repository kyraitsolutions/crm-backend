import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response.js";
import os from "os";
import redisClient from "../config/redis.js";
import mongoose from "mongoose";
import { ENV } from "../constants/env.constants.js";
// TBD

export class HealthController {
    checkHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {

            let mongoStatus="down";
            try {
                await mongoose.connection.db?.admin().ping();
                mongoStatus="up";
            } catch (error) {
                mongoStatus="down";
            }

            let redisStatus = "down";
            try {
                const pong = await (redisClient as any)?.ping?.();
                redisStatus= pong==="PONG"?"up":"down";
            } catch (error) {
                redisStatus = "down";
            }

            const isHealthy =mongoStatus === "up" &&redisStatus === "up";
            const response = {
                success: true,
                status: isHealthy?"healthy":"unhealthy",
                message: isHealthy
                    ? "API is running successfully."
                    : "One or more services are unavailable.",
                version: ENV.APP.APP_VERSION || "v1.0.0",
                environment: ENV.APP.NODE_ENV || "development",
                uptime: Math.floor(process.uptime()),
                timestamp: new Date().toISOString(),
                services: {
                    api: "up",
                    mongodb: mongoStatus,
                    redis: redisStatus,
                },
                server: {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    nodeVersion: process.version,
                    cpu: os.cpus().length,
                    memory: {
                        total: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                        free: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    },
                },
            }

            httpResponse(req, res, 200, "Health check passed", response);
        } catch (error) {
            next(error);
        }
    }

};