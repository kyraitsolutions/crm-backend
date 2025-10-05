import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import { ENV } from "../constants";

dotenv.config();

export interface JwtPayload {
  userId: number;
  email: string;
}

export class JwtUtil {
  private static readonly SECRET = ENV.JWT_SECRET || "default-secret";
  private static readonly EXPIRES_IN = "7d";

  static sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN });
  }

  static verify(token: string): JwtPayload {
    return jwt.verify(token, this.SECRET) as JwtPayload;
  }

  static decode(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}
