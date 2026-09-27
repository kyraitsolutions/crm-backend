import { AI_KNOWLEDGE_TRACKING_PARAMS } from "../constants/knowledge.constant.js";

const TRACKING = new Set<string>(AI_KNOWLEDGE_TRACKING_PARAMS);

export const normalizePublicUrl = (raw: string, base?: string) => {
  let url: URL;
  try {
    url = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }
  const params = [...url.searchParams.entries()].filter(
    ([key]) => !TRACKING.has(key.toLowerCase()),
  );
  params.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const search = new URLSearchParams(params);
  url.search = search.toString() ? `?${search.toString()}` : "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }
  return url.toString();
};

export const canonicalUrlKey = (raw: string) => {
  const normalized = normalizePublicUrl(raw);
  if (!normalized) return raw.trim().toLowerCase();
  const url = new URL(normalized);
  url.hostname = url.hostname.replace(/^www\./, "");
  return url.toString();
};

export const sameSiteHost = (left: string, right: string) => {
  try {
    const a = new URL(left).hostname.replace(/^www\./, "");
    const b = new URL(right).hostname.replace(/^www\./, "");
    return a === b;
  } catch {
    return false;
  }
};
