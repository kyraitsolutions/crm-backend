// config/env.ts
import * as dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
console.log("env", env);

// Load specific env file
dotenv.config({
  path: `.env.${env}`,
});

// Optional fallback
dotenv.config();

export const ENV = {
  APP: {
    APP_VERSION: process.env.APP_VERSION || "v1.0.0",
    PORT: process.env.PORT || "3000",
    NODE_ENV: process.env.NODE_ENV || "development",
  },

  AUTH: {
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN!,
    JWT_ALGORITHM: process.env.JWT_ALGORITHM!,
    OTP_TTL_SECONDS: process.env.OTP_TTL_SECONDS!,
    MAX_ATTEMPTS: process.env.MAX_ATTEMPTS!,
    OTP_LENGTH: process.env.OTP_LENGTH!,
  },

  DB: {
    DATABASE_URL: process.env.DATABASE_URL!,
  },

  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
    CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL!,
  },

  AI: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    OPENAI_MODEL: process.env.OPENAI_MODEL!,
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY!,
    GOOGLE_GENAI_MODEL: process.env.GOOGLE_GENAI_MODEL!,
  },

  AWS: {
    CDN_DOMAIN: process.env.AWS_CDN_DOMAIN!,
    REGION: process.env.AWS_REGION!,
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    SECRET_KEY: process.env.AWS_SECRET_KEY!,
    S3_BUCKET: process.env.AWS_S3_BUCKET!,
  },

  FRONTEND: {
    CALLBACK_URL: process.env.FRONT_END_CALLBACK_URL!,
  },

  CROSS_DOMAIN: {
    ORIGIN: process.env.CORS_ORIGINS,
  },

  URL: {
    BACKEND_URL: process.env.BACKEND_URL!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
  },

  META: {
    APP_ID: process.env.META_APP_ID!,
    APP_SECRET: process.env.META_APP_SECRET!,
    GRAPH_BASE_URL: process.env.META_GRAPH_BASE_URL!,
    GRAPH_VERSION: process.env.META_GRAPH_VERSION!,
    REDIRECT_URI: process.env.META_REDIRECT_URI,
    VERIFY_WEBHOOK_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN!,
    SYSTEM_USER_ACCESS_TOKEN: process.env.SYSTEM_USER_ACCESS_TOKEN!,
  },

  SMTP: {
    SMTP_HOST: process.env.SMTP_HOST!,
    SMTP_PORT: process.env.SMTP_PORT!,
    SMTP_USER: process.env.SMTP_USER!,
    SMTP_PASS: process.env.SMTP_PASS!,
  },

  REDIS: {
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: process.env.REDIS_PORT!,
    REDIS_PASS: process.env.REDIS_PASS!,
  },
  QUEUE: {
    QUEUE_CONCURRENCY: process.env.QUEUE_CONCURRENCY!,
  },
};

// import * as dotenv from "dotenv";

// dotenv.config();

// export const ENV = {
//   JWT_SECRET: process.env.JWT_SECRET,
//   GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
//   GOOGLE_GENAI_MODEL:process.env.GOOGLE_GENAI_MODEL,
//   GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
//   GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
//   GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
//   FRONT_END_CALLBACK_URL: process.env.FRONT_END_CALLBACK_URL,
//   PORT: process.env.PORT,
//   DATABASE_URL: process.env.DATABASE_URL,
//   JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
//   NODE_ENV: process.env.NODE_ENV ?? "development",
//   OPENAI_API_KEY:process.env.OPENAI_API_KEY,
//   OPENAI_MODEL:process.env.OPENAI_MODEL
// };
