import { ENV } from "../constants";

export const config = {
  port: ENV.PORT || 3000,
  jwtSecret: ENV.JWT_SECRET || "default-secret",
  databaseUrl: ENV.DATABASE_URL!,
  google: {
    clientId: ENV.GOOGLE_CLIENT_ID || "",
    clientSecret: ENV.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      ENV.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback",
  },
};
