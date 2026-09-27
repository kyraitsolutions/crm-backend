import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const isPrivateIp = (ip: string) => {
  const lower = ip.toLowerCase().split("%")[0].replace(/^::ffff:/, "");
  if (BLOCKED.has(lower) || lower === "::") return true;
  const parts = lower.split(".").map(Number);
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part))) {
    if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
    if (parts[0] >= 224) return true;
  }
  return (
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower === "::1"
  );
};

const isBlockedHost = (hostname: string) => {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED.has(host)) return true;
  return (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  );
};

export const assertPublicHttpUrl = async (raw: string) => {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("Authenticated URLs are not allowed");
  }
  if (isBlockedHost(url.hostname)) {
    throw new Error("This URL is not allowed");
  }
  const addresses = isIP(url.hostname)
    ? [url.hostname]
    : (await lookup(url.hostname, { all: true })).map((item) => item.address);
  if (!addresses.length || addresses.some(isPrivateIp)) {
    throw new Error("This URL is not allowed");
  }
  return url;
};
