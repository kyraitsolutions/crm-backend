import type {
  AI_KNOWLEDGE_SOURCE_STATUS,
  AI_KNOWLEDGE_SOURCE_TYPE,
} from "../constants/knowledge.constant.js";

export type TAiKnowledgeSourceType =
  (typeof AI_KNOWLEDGE_SOURCE_TYPE)[keyof typeof AI_KNOWLEDGE_SOURCE_TYPE];
export type TAiKnowledgeSourceStatus =
  (typeof AI_KNOWLEDGE_SOURCE_STATUS)[keyof typeof AI_KNOWLEDGE_SOURCE_STATUS];

export type TKnowledgeBlockKind = "faq" | "section" | "table" | "contact" | "prose";

export type TKnowledgeBlock = {
  heading: string;
  content: string;
  kind: TKnowledgeBlockKind;
  sourceUrl?: string;
  question?: string;
  answer?: string;
};

export type TAiKnowledgeChunkMeta = {
  startChar: number;
  endChar: number;
  title?: string;
  sourceUrl?: string;
  heading?: string;
  section?: string;
  contentType?: TKnowledgeBlockKind | string;
  question?: string;
  answer?: string;
};

export type TAiKnowledgeChunk = {
  content: string;
  index: number;
  metadata: TAiKnowledgeChunkMeta;
};

export type TAiKnowledgeParsedDocument = {
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  blocks: TKnowledgeBlock[];
};

export type TRetrievedChunk = {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  similarity: number;
  metadata: TAiKnowledgeChunkMeta;
};

export type TAiKnowledgeRetrieveInput = {
  query: string;
  organizationId?: string;
  sourceIds?: string[];
  topK?: number;
  similarityThreshold?: number;
  hybridWeight?: number;
};
