import { HttpError } from "../../../utils/http.error.js";
import {
  AI_KNOWLEDGE_SOURCE_TYPE,
} from "../constants/knowledge.constant.js";
import type { TAiKnowledgeSourceType } from "../types/knowledge.type.js";

const SOURCE_TYPES = Object.values(AI_KNOWLEDGE_SOURCE_TYPE).filter(
  (type) => type !== AI_KNOWLEDGE_SOURCE_TYPE.LEGACY_WHATSAPP,
);

const asString = (value: unknown, fallback = "") =>
  value == null ? fallback : String(value);

const asStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

export class CreateAiKnowledgeSourceDto {
  type: TAiKnowledgeSourceType;
  title: string;
  uri: string;
  content: string;
  tags: string[];

  constructor(data: Record<string, unknown>) {
    const type = asString(data.type, AI_KNOWLEDGE_SOURCE_TYPE.TEXT);
    if (!SOURCE_TYPES.includes(type as (typeof SOURCE_TYPES)[number])) {
      throw HttpError.badRequest("Invalid knowledge source type");
    }
    this.type = type as TAiKnowledgeSourceType;
    this.title = asString(data.title).trim();
    this.uri = asString(data.uri).trim();
    this.content = asString(data.content).trim();
    this.tags = asStringArray(data.tags);

    if (!this.title) throw HttpError.badRequest("Please add a title.");
    if (this.type === AI_KNOWLEDGE_SOURCE_TYPE.URL) {
      if (!this.uri) throw HttpError.badRequest("Please enter a website URL.");
    } else if (this.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE) {
      if (!this.uri) throw HttpError.badRequest("Please upload a PDF.");
    } else if (!this.content) {
      throw HttpError.badRequest("Please paste the information you want Kyra to learn.");
    }
  }
}

export class RetrieveAiKnowledgeDto {
  query: string;
  sourceIds: string[];
  topK?: number;
  similarityThreshold?: number;
  hybridWeight?: number;

  constructor(data: Record<string, unknown>) {
    this.query = asString(data.query).trim();
    if (!this.query) throw HttpError.badRequest("Query is required");
    this.sourceIds = asStringArray(data.sourceIds);
    if (data.topK != null) this.topK = Number(data.topK);
    if (data.similarityThreshold != null) {
      this.similarityThreshold = Number(data.similarityThreshold);
    }
    if (data.hybridWeight != null) this.hybridWeight = Number(data.hybridWeight);
  }
}
