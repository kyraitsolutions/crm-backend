import { createHash } from "crypto";

export const cosineSimilarity = (a: number[], b: number[]) => {
  const size = Math.min(a.length, b.length);
  if (!size) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < size; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    dot += left * right;
    normA += left * left;
    normB += right * right;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const checksumFor = (parts: Array<string | undefined>) =>
  createHash("sha256")
    .update(parts.map((part) => String(part || "")).join("\n"))
    .digest("hex");

