import { ENV } from "../constants/index.js";

export const config = {
  app: {
    port: Number(ENV.APP.PORT) || 3000,
  },
  auth: {
    jwtSecret: ENV.AUTH.JWT_SECRET as string,
    jwtExpiresIn: ENV.AUTH.JWT_EXPIRES_IN,
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
  },
  aws: {
    cdnDomain: ENV.AWS.CDN_DOMAIN,
    region: ENV.AWS.REGION,
    bucket: ENV.AWS.S3_BUCKET,
    accessKeyId: ENV.AWS.ACCESS_KEY_ID,
    secretAccessKey: ENV.AWS.SECRET_KEY,
  },

  cross_domains: {
    origin: ENV.CROSS_DOMAIN.ORIGIN?.split(",").map((o: string) => o.trim()),
  },
};
