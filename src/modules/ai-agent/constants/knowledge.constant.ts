export const AI_KNOWLEDGE_SOURCE_TYPE = {
  TEXT: "text",
  FAQ: "faq",
  URL: "url",
  FILE: "file",
  LEGACY_WHATSAPP: "legacy_whatsapp",
} as const;

export const AI_KNOWLEDGE_SOURCE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
  ARCHIVED: "archived",
} as const;

export const AI_KNOWLEDGE_CHUNK = {
  MAX_CHUNK_SIZE: 900,
  MIN_CHUNK_SIZE: 40,
  FAQ_MIN_CHUNK_SIZE: 20,
  OVERLAP_SIZE: 120,
  MAX_CHUNKS: 180,
  SEPARATORS: ["\n\n", "\n", ". ", " "],
} as const;

export const AI_KNOWLEDGE_CRAWL = {
  MAX_PAGES: 20,
  MAX_DEPTH: 3,
  MAX_BYTES: 1_500_000,
  REQUEST_TIMEOUT_MS: 12_000,
  TOTAL_DURATION_MS: 90_000,
  CONCURRENCY: 3,
  MAX_REDIRECTS: 5,
  SITEMAP_URL_CAP: 200,
  MIN_PAGE_CHARS: 80,
} as const;

export const AI_KNOWLEDGE_FILE = {
  MAX_BYTES: 15 * 1024 * 1024,
  MAX_TEXT_CHARS: 400_000,
} as const;

export const AI_KNOWLEDGE_TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "igshid",
] as const;

export const AI_KNOWLEDGE_RETRIEVAL = {
  TOP_K: 4,
  SIMILARITY_THRESHOLD: 0.34,
  VECTOR_ACCEPT: 0.42,
  HYBRID_WEIGHT: 0.55,
  VECTOR_CANDIDATE_LIMIT: 800,
  KEYWORD_CANDIDATE_LIMIT: 40,
} as const;

export const AI_KNOWLEDGE_EMBEDDING = {
  MODEL: "text-embedding-3-small",
  DIMENSIONS: 1024,
  BATCH_SIZE: 50,
} as const;
