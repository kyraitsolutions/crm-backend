// config/env.ts
import * as dotenv from "dotenv";

const env = process.env.NODE_ENV || "development";
console.log("env kya hai", env);

// Load specific env file
dotenv.config({
  path: `.env.${env}`,
});

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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
    GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY || "",
    GOOGLE_GENAI_MODEL: process.env.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview",
    SARVAM_API_KEY: process.env.SARVAM_API_KEY || "",
    SARVAM_MODEL: process.env.SARVAM_MODEL || "sarvam-105b-conversations",
  },

  AWS: {
    CDN_DOMAIN: process.env.AWS_CDN_DOMAIN!,
    REGION: process.env.AWS_REGION!,
    S3_REGION: process.env.AWS_S3_REGION || process.env.AWS_REGION!,
    ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
    SECRET_KEY: process.env.AWS_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
    SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY!,
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
    EMAIL_TRACKING_BASE_URL: process.env.EMAIL_TRACKING_BASE_URL,
  },

  META: {
    APP_ID: process.env.META_APP_ID!,
    APP_SECRET: process.env.META_APP_SECRET!,
    GRAPH_BASE_URL: process.env.META_GRAPH_BASE_URL!,
    GRAPH_VERSION: process.env.META_GRAPH_VERSION!,
    REDIRECT_URI: process.env.META_REDIRECT_URI,
    VERIFY_WEBHOOK_TOKEN_FB: process.env.META_WEBHOOK_VERIFY_TOKEN_FB!,
    VERIFY_WEBHOOK_TOKEN_WA: process.env.META_WEBHOOK_VERIFY_TOKEN_WA!,
    SYSTEM_USER_ACCESS_TOKEN: process.env.SYSTEM_USER_ACCESS_TOKEN!,
  },

  SMTP: {
    AWS_EMAIL_REGION: process.env.AWS_EMAIL_REGION,
    AWS_FROM_EMAIL: process.env.AWS_FROM_EMAIL,
    EMAIl_AWS_ACCESS_KEY_ID: process.env.EMAIl_AWS_ACCESS_KEY_ID,
    EMAIL_AWS_SECRET_KEY: process.env.EMAIL_AWS_SECRET_KEY,
    SMTP_HOST: process.env.SMTP_HOST!,
    SMTP_PORT: process.env.SMTP_PORT!,
    SMTP_USER: process.env.SMTP_USER!,
    SMTP_PASS: process.env.SMTP_PASS!,
    FROM_EMAIL: process.env.FROM_EMAIL!,
  },

  REDIS: {
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: process.env.REDIS_PORT!,
    REDIS_PASS: process.env.REDIS_PASS!,
  },
  QUEUE: {
    QUEUE_CONCURRENCY: process.env.QUEUE_CONCURRENCY!,
  },
  TWILIO: {
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER!,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID!,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN!,
  },
  RAZORPAY: {
    KEY_ID: process.env.RAZORPAY_KEY_ID!,
    KEY_SECRET: process.env.RAZORPAY_KEY_SECRET!,
    WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET!,
  },

  IMPORT: {
    WORKER_CONCURRENCY: process.env.IMPORT_WORKER_CONCURRENCY,
    ORG_ACTIVE_SLOTS: process.env.IMPORT_ORG_ACTIVE_SLOTS,
    DISPATCH_K: process.env.IMPORT_DISPATCH_K,
    HEARTBEAT_MS: process.env.IMPORT_HEARTBEAT_MS,
    CHUNK_ATTEMPTS: process.env.IMPORT_CHUNK_ATTEMPTS,
    BACKOFF_BASE_MS: process.env.IMPORT_BACKOFF_BASE_MS,
    STALL_MAX_MS: process.env.IMPORT_STALL_MAX_MS,
    SWEEP_INTERVAL_MS: process.env.IMPORT_SWEEP_INTERVAL_MS,
    CHECK_REDIS_POLICY: process.env.IMPORT_CHECK_REDIS_POLICY,
    XLSX_TEMP_DIR: process.env.IMPORT_XLSX_TEMP_DIR,
    XLSX_TEMP_MAX_BYTES: process.env.IMPORT_XLSX_TEMP_MAX_BYTES,
    CHUNK_ROWS: process.env.IMPORT_CHUNK_ROWS,
    CHUNK_MAX_BYTES: process.env.IMPORT_CHUNK_MAX_BYTES,
    FILE_STORE: process.env.IMPORT_FILE_STORE,
    LOCAL_STORE_ROOT: process.env.IMPORT_LOCAL_STORE_ROOT,
    SOURCE_TTL_MS: process.env.IMPORT_SOURCE_TTL_MS,
    ERROR_REPORT_TTL_MS: process.env.IMPORT_ERROR_REPORT_TTL_MS,
    CHUNK_RETENTION_MS: process.env.IMPORT_CHUNK_RETENTION_MS,
    ABANDONED_UPLOAD_MS: process.env.IMPORT_ABANDONED_UPLOAD_MS,
    GRACEFUL_SHUTDOWN_MS: process.env.IMPORT_GRACEFUL_SHUTDOWN_MS,
    MAX_XLSX_FILE_BYTES: process.env.IMPORT_MAX_XLSX_FILE_BYTES,
    MAX_XLSX_ROWS: process.env.IMPORT_MAX_XLSX_ROWS,
    MAX_COLUMNS: process.env.IMPORT_MAX_COLUMNS,
    MAX_XLSX_UNCOMPRESSED: process.env.IMPORT_MAX_XLSX_UNCOMPRESSED,
    MAX_XLSX_RATIO: process.env.IMPORT_MAX_XLSX_RATIO,
    MAX_XLSX_ENTRIES: process.env.IMPORT_MAX_XLSX_ENTRIES,
    MAX_XLSX_ENTRY_BYTES: process.env.IMPORT_MAX_XLSX_ENTRY_BYTES,
    MAX_SHARED_STRINGS_BYTES: process.env.IMPORT_MAX_SHARED_STRINGS_BYTES,
    MAX_ACTIVE_PER_ACCOUNT: process.env.IMPORT_MAX_ACTIVE_PER_ACCOUNT,
    MAX_CREATES_PER_HOUR: process.env.IMPORT_MAX_CREATES_PER_HOUR,
    MAX_DRY_RUNS_PER_HOUR: process.env.IMPORT_MAX_DRY_RUNS_PER_HOUR,
    AV_SCAN_ENABLED: process.env.IMPORT_AV_SCAN_ENABLED,
    SSE_HEARTBEAT_MS: process.env.IMPORT_SSE_HEARTBEAT_MS,
    SSE_POLL_MS: process.env.IMPORT_SSE_POLL_MS,
    SSE_MAX_CONNECTIONS_PER_USER: process.env.IMPORT_SSE_MAX_CONNECTIONS_PER_USER,
  },
};
