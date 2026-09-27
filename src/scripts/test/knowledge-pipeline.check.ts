import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { AI_KNOWLEDGE_CHUNK } from "../../modules/ai-agent/constants/knowledge.constant.js";
import { checksumFor } from "../../modules/ai-agent/utils/vector.util.js";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: AI_KNOWLEDGE_CHUNK.MAX_CHUNK_SIZE,
  chunkOverlap: AI_KNOWLEDGE_CHUNK.OVERLAP_SIZE,
  separators: [...AI_KNOWLEDGE_CHUNK.SEPARATORS],
});

const text = Array.from({ length: 40 }, (_, index) => `Section ${index}. The hotel check-in time is 2 PM.`).join("\n\n");
const chunks = await splitter.splitDocuments([
  new Document({ pageContent: text, metadata: { title: "Policy" } }),
]);

if (!chunks.length) throw new Error("splitter produced no chunks");
if (chunks.some((chunk) => chunk.pageContent.length > AI_KNOWLEDGE_CHUNK.MAX_CHUNK_SIZE + 20)) {
  throw new Error("chunk exceeded the configured size");
}

const same = checksumFor(["a", "b"]);
if (same !== checksumFor(["a", "b"])) throw new Error("checksum is not stable");
if (same === checksumFor(["b", "a"])) throw new Error("checksum should follow input order");

console.log("knowledge pipeline check passed", { chunks: chunks.length });
