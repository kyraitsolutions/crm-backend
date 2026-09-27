import { readFile, unlink } from "fs/promises";
import axios from "axios";
import { config } from "../../../config/index.js";
import { mediaService } from "../../../container.js";
import logger from "../../../utils/logger.js";
import { AI_KNOWLEDGE_FILE } from "../constants/knowledge.constant.js";
import { KnowledgeIngestError } from "../utils/knowledge-error.util.js";

const cdnHost = () =>
  String(config.aws.cdnDomain || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

export const knowledgeFileUrl = (storageKey: string) => {
  const raw = String(storageKey || "").trim();
  if (!raw || raw.startsWith("file:")) return raw;
  if (raw.startsWith("s3:")) {
    const host = cdnHost();
    return host ? `https://${host}/${raw.slice(3)}` : "";
  }
  return raw;
};

export const assertKnowledgeFileUrl = (raw: string) => {
  const fileUrl = knowledgeFileUrl(raw);
  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    throw new KnowledgeIngestError(
      "Please upload a PDF.",
      "invalid_file",
    );
  }
  const path = decodeURIComponent(url.pathname).toLowerCase();
  if (url.protocol !== "https:" || url.host !== cdnHost() || !path.endsWith(".pdf")) {
    throw new KnowledgeIngestError(
      "Please upload a PDF.",
      "invalid_file",
    );
  }
  return url.toString();
};

export class AiKnowledgeFileStore {
  async read(storageKey: string) {
    if (storageKey.startsWith("file:")) {
      return readFile(storageKey.slice(5));
    }
    const fileUrl = assertKnowledgeFileUrl(storageKey);
    const response = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30_000,
      maxContentLength: AI_KNOWLEDGE_FILE.MAX_BYTES,
      maxBodyLength: AI_KNOWLEDGE_FILE.MAX_BYTES,
    });
    const buffer = Buffer.from(response.data);
    if (!buffer.length) {
      throw new KnowledgeIngestError(
        "We couldn't read this file. Please upload it again.",
        "missing_file",
      );
    }
    return buffer;
  }

  async remove(storageKey: string) {
    if (!storageKey) return;
    try {
      if (storageKey.startsWith("file:")) {
        await unlink(storageKey.slice(5));
        return;
      }
      await mediaService.deleteByFileUrl(knowledgeFileUrl(storageKey));
    } catch (error) {
      logger.warn("AI_KNOWLEDGE_FILE_DELETE_FAILED", {
        storageKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const aiKnowledgeFileStore = new AiKnowledgeFileStore();
