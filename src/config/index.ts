import { ENV } from "../constants/index.js";

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function optionalPositiveInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function optionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return fallback;
}

const importHeartbeatMs = positiveInt(ENV.IMPORT.HEARTBEAT_MS, 10_000);

export const config = {
  app: {
    version: ENV.APP.APP_VERSION,
    port: Number(ENV.APP.PORT) || 3000,
    nodeEnv: ENV.APP.NODE_ENV,
  },

  auth: {
    jwtSecret: ENV.AUTH.JWT_SECRET as string,
    jwtExpiresIn: ENV.AUTH.JWT_EXPIRES_IN,
    jwtAlgorithm: ENV.AUTH.JWT_ALGORITHM,
    otpTtlSeconds: ENV.AUTH.OTP_TTL_SECONDS,
    maxAttempts: ENV.AUTH.MAX_ATTEMPTS,
    otpLength: ENV.AUTH.OTP_LENGTH,
  },

  db: {
    url: ENV.DB.DATABASE_URL,
  },

  google: {
    clientId: ENV.GOOGLE.CLIENT_ID,
    clientSecret: ENV.GOOGLE.CLIENT_SECRET,
    callbackUrl:
      ENV.GOOGLE.CALLBACK_URL ||
      "http://localhost:3000/api/auth/google/callback",
    redirectUri: ENV.GOOGLE.REDIRECT_URI,
  },

  ai: {
    openaiApiKey: ENV.AI.OPENAI_API_KEY,
    openaiModel: ENV.AI.OPENAI_MODEL,
    googleGenaiApiKey: ENV.AI.GOOGLE_GENAI_API_KEY,
    googleGenaiModel: ENV.AI.GOOGLE_GENAI_MODEL,
    sarvamApiKey: ENV.AI.SARVAM_API_KEY,
    sarvamModel: ENV.AI.SARVAM_MODEL,
  },

  meta: {
    APP_ID: ENV.META.APP_ID,
    APP_SECRET: ENV.META.APP_SECRET,
    CONFIG_ID: ENV.META.CONFIG_ID,
    GRAPH_BASE_URL: ENV.META.GRAPH_BASE_URL,
    GRAPH_VERSION: ENV.META.GRAPH_VERSION,
    REDIRECT_URI: ENV.META.REDIRECT_URI,
    VERIFY_WEBHOOK_TOKEN_FB: ENV.META.VERIFY_WEBHOOK_TOKEN_FB,
    VERIFY_WEBHOOK_TOKEN_WA: ENV.META.VERIFY_WEBHOOK_TOKEN_WA,
    SYSTEM_USER_ACCESS_TOKEN: ENV.META.SYSTEM_USER_ACCESS_TOKEN,
  },

  aws: {
    cdnDomain: ENV.AWS.CDN_DOMAIN,
    region: ENV.AWS.REGION,
    s3Region: ENV.AWS.S3_REGION || ENV.AWS.REGION,
    bucket: ENV.AWS.S3_BUCKET,
    accessKeyId: ENV.AWS.ACCESS_KEY_ID,
    secretAccessKey: ENV.AWS.SECRET_KEY || ENV.AWS.SECRET_ACCESS_KEY,
  },

  frontend: {
    callbackUrl: ENV.FRONTEND.CALLBACK_URL,
  },

  url: {
    backendUrl: ENV.URL.BACKEND_URL,
    frontendUrl: ENV.URL.FRONTEND_URL,
    emailTrackingBaseUrl: ENV.URL.EMAIL_TRACKING_BASE_URL,
  },

  smtp: {
    awsEmailRegion: ENV.SMTP.AWS_EMAIL_REGION,
    awsFromEmail: ENV.SMTP.AWS_FROM_EMAIL,
    emailAwsAccessKeyId: ENV.SMTP.EMAIl_AWS_ACCESS_KEY_ID,
    emailAwsSecretKey: ENV.SMTP.EMAIL_AWS_SECRET_KEY,
    host: ENV.SMTP.SMTP_HOST,
    port: ENV.SMTP.SMTP_PORT,
    user: ENV.SMTP.SMTP_USER,
    pass: ENV.SMTP.SMTP_PASS,
    fromEmail: ENV.SMTP.FROM_EMAIL,
  },

  cross_domains: {
    origin: ENV.CROSS_DOMAIN.ORIGIN?.split(",").map((o: string) => o.trim()),
  },

  redis: {
    host: ENV.REDIS.REDIS_HOST,
    port: Number(ENV.REDIS.REDIS_PORT) || 6379,
    pass: ENV.REDIS.REDIS_PASS,
  },

  queue: {
    concurrency: ENV.QUEUE.QUEUE_CONCURRENCY,
  },

  twilio: {
    phoneNumber: ENV.TWILIO.TWILIO_PHONE_NUMBER,
    accountSid: ENV.TWILIO.TWILIO_ACCOUNT_SID,
    authToken: ENV.TWILIO.TWILIO_AUTH_TOKEN,
  },

  razorpay: {
    keyId: ENV.RAZORPAY.KEY_ID,
    keySecret: ENV.RAZORPAY.KEY_SECRET,
    webhookSecret: ENV.RAZORPAY.WEBHOOK_SECRET,
  },

  import: {
    workerConcurrency: positiveInt(ENV.IMPORT.WORKER_CONCURRENCY, 2),
    orgActiveSlots: positiveInt(ENV.IMPORT.ORG_ACTIVE_SLOTS, 2),
    dispatchK: positiveInt(ENV.IMPORT.DISPATCH_K, 3),
    heartbeatMs: importHeartbeatMs,
    leaseMs: importHeartbeatMs * 3,
    chunkAttempts: positiveInt(ENV.IMPORT.CHUNK_ATTEMPTS, 5),
    backoffBaseMs: positiveInt(ENV.IMPORT.BACKOFF_BASE_MS, 2_000),
    stallMaxMs: positiveInt(ENV.IMPORT.STALL_MAX_MS, 30 * 60 * 1000),
    sweepIntervalMs: positiveInt(ENV.IMPORT.SWEEP_INTERVAL_MS, 60_000),
    checkRedisPolicy: boolEnv(ENV.IMPORT.CHECK_REDIS_POLICY, true),
    xlsxTempDir: optionalString(ENV.IMPORT.XLSX_TEMP_DIR),
    xlsxTempMaxBytes: optionalPositiveInt(ENV.IMPORT.XLSX_TEMP_MAX_BYTES),
    rowsPerChunk: positiveInt(ENV.IMPORT.CHUNK_ROWS, 1000),
    maxChunkBytes: positiveInt(ENV.IMPORT.CHUNK_MAX_BYTES, 2 * 1024 * 1024),
    fileStore: (ENV.IMPORT.FILE_STORE === "s3" ? "s3" : "local") as "local" | "s3",
    localStoreRoot: optionalString(ENV.IMPORT.LOCAL_STORE_ROOT),
    sourceTtlMs: positiveInt(ENV.IMPORT.SOURCE_TTL_MS, 7 * 24 * 60 * 60 * 1000),
    errorReportTtlMs: positiveInt(ENV.IMPORT.ERROR_REPORT_TTL_MS, 30 * 24 * 60 * 60 * 1000),
    chunkRetentionMs: positiveInt(ENV.IMPORT.CHUNK_RETENTION_MS, 90 * 24 * 60 * 60 * 1000),
    abandonedUploadMs: positiveInt(ENV.IMPORT.ABANDONED_UPLOAD_MS, 24 * 60 * 60 * 1000),
    gracefulShutdownMs: positiveInt(ENV.IMPORT.GRACEFUL_SHUTDOWN_MS, 30_000),
    maxXlsxFileBytes: positiveInt(ENV.IMPORT.MAX_XLSX_FILE_BYTES, 250 * 1024 * 1024),
    maxXlsxRows: positiveInt(ENV.IMPORT.MAX_XLSX_ROWS, 500_000),
    maxColumns: positiveInt(ENV.IMPORT.MAX_COLUMNS, 64),
    maxXlsxUncompressed: positiveInt(ENV.IMPORT.MAX_XLSX_UNCOMPRESSED, 400 * 1024 * 1024),
    maxXlsxRatio: positiveInt(ENV.IMPORT.MAX_XLSX_RATIO, 100),
    maxXlsxEntries: positiveInt(ENV.IMPORT.MAX_XLSX_ENTRIES, 64),
    maxXlsxEntryBytes: positiveInt(ENV.IMPORT.MAX_XLSX_ENTRY_BYTES, 250 * 1024 * 1024),
    maxSharedStringsBytes: positiveInt(ENV.IMPORT.MAX_SHARED_STRINGS_BYTES, 32 * 1024 * 1024),
    maxActivePerAccount: positiveInt(ENV.IMPORT.MAX_ACTIVE_PER_ACCOUNT, 2),
    maxCreatesPerHour: positiveInt(ENV.IMPORT.MAX_CREATES_PER_HOUR, 20),
    maxDryRunsPerHour: positiveInt(ENV.IMPORT.MAX_DRY_RUNS_PER_HOUR, 30),
    avScanEnabled: boolEnv(ENV.IMPORT.AV_SCAN_ENABLED, false),
    sseHeartbeatMs: positiveInt(ENV.IMPORT.SSE_HEARTBEAT_MS, 15_000),
    ssePollMs: positiveInt(ENV.IMPORT.SSE_POLL_MS, 1_000),
    sseMaxConnectionsPerUser: positiveInt(ENV.IMPORT.SSE_MAX_CONNECTIONS_PER_USER, 4),
  },
};

export type AppConfig = typeof config;
export type ImportConfig = typeof config.import;
