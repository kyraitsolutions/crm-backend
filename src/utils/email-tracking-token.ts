import crypto from "crypto";
import { ENV } from "../constants/env.constants.js";

export type TrackingKind = "open" | "click" | "unsub";

export type TrackingPayload = {
  t: TrackingKind;
  c: string;
  r: string;
  u?: string;
};

const secret = () =>
  String(process.env.EMAIL_TRACKING_SECRET || ENV.AUTH.JWT_SECRET || "kyra-email");

const toBase64Url = (value: string) =>
  Buffer.from(value).toString("base64url");

const sign = (body: string) =>
  crypto.createHmac("sha256", secret()).update(body).digest("base64url");

export const createTrackingToken = (payload: TrackingPayload) => {
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}~${sign(body)}`;
};

export const verifyTrackingToken = (token: string): TrackingPayload | null => {
  try {
    const raw = decodeURIComponent(String(token || ""));
    const separator = raw.includes("~") ? "~" : ".";
    const idx = raw.lastIndexOf(separator);
    if (idx <= 0) return null;
    const body = raw.slice(0, idx);
    const signature = raw.slice(idx + 1);
    if (!body || !signature) return null;
    const expected = sign(body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TrackingPayload;
    if (!parsed?.t || !parsed.c || !parsed.r) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const publicApiBase = () => {
  const fromCallback = () => {
    const callback = ENV.GOOGLE.CALLBACK_URL;
    if (!callback) return "";
    try {
      return new URL(callback).origin;
    } catch {
      return "";
    }
  };

  const candidates = [
    process.env.EMAIL_TRACKING_BASE_URL,
    ENV.URL.EMAIL_TRACKING_BASE_URL,
    ENV.URL.BACKEND_URL,
    fromCallback(),
  ];

  for (const candidate of candidates) {
    const url = String(candidate || "").replace(/\/$/, "");
    if (url.startsWith("https://")) return url;
  }

  const port = ENV.APP.PORT || "3000";
  return `http://localhost:${port}`;
};

export const normalizeProviderMessageId = (value?: string) =>
  String(value || "")
    .trim()
    .replace(/^<|>$/g, "");
