import { Types } from "mongoose";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  AI_KNOWLEDGE_CHUNK,
  AI_KNOWLEDGE_FILE,
  AI_KNOWLEDGE_SOURCE_STATUS,
  AI_KNOWLEDGE_SOURCE_TYPE,
} from "../constants/knowledge.constant.js";
import type { AiKnowledgeSource } from "../models/ai-knowledge-source.model.js";
import { aiKnowledgeRepository } from "../repositories/ai-knowledge.repository.js";
import {
  friendlyKnowledgeError,
  KnowledgeIngestError,
} from "../utils/knowledge-error.util.js";
import { checksumFor } from "../utils/vector.util.js";
import { aiKnowledgeFileStore } from "./ai-knowledge-file-store.js";
import { aiKnowledgeLoaderFactory } from "./ai-knowledge-loader.service.js";
import { aiKnowledgeVectorService } from "./ai-knowledge-vector.service.js";
import logger from "../../../utils/logger.js";

const pageKey = (doc: Document, fallback: string) =>
  String(doc.metadata?.source || doc.metadata?.url || fallback);

export class AiKnowledgeIngestionService {
  private splitter = new RecursiveCharacterTextSplitter({
    chunkSize: AI_KNOWLEDGE_CHUNK.MAX_CHUNK_SIZE,
    chunkOverlap: AI_KNOWLEDGE_CHUNK.OVERLAP_SIZE,
    separators: [...AI_KNOWLEDGE_CHUNK.SEPARATORS],
  });

  async ingestSource(source: AiKnowledgeSource) {
    source.status = AI_KNOWLEDGE_SOURCE_STATUS.PROCESSING;
    source.errorMessage = "";
    source.progressMessage =
      source.type === AI_KNOWLEDGE_SOURCE_TYPE.URL
        ? "Reading website..."
        : source.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE
          ? "Reading your document..."
          : "Reading your text...";
    await aiKnowledgeRepository.saveSource(source);

    try {
      console.log("loadPages");
      const pages = await this.loadPages(source);

      console.log("pages", pages[0]);

      const fingerprint = checksumFor(
        pages
          .map(
            (page) =>
              `${pageKey(page, source.uri || source.title)}\n${page.pageContent}`,
          )
          .sort(),
      );

      console.log("aaaya");

      if (source.checksum === fingerprint && source.chunkCount > 0) {
        source.status = AI_KNOWLEDGE_SOURCE_STATUS.READY;
        source.progressMessage = "Knowledge ready";
        await aiKnowledgeRepository.saveSource(source);
        return source;
      }

      source.progressMessage = "Building knowledge...";
      source.checksum = "";
      source.chunkCount = 0;
      source.documentCount = 0;
      await aiKnowledgeRepository.saveSource(source);
      await this.clearIndexed(source);

      const organizationId = String(source.organizationId);
      const accountId = String(source.accountId);
      const agentId = String(source.agentId);
      const namespace = aiKnowledgeVectorService.namespace(
        organizationId,
        accountId,
        agentId,
      );
      let chunkCount = 0;
      let remaining = AI_KNOWLEDGE_CHUNK.MAX_CHUNKS;

      console.log("pages length", pages.length);
      console.log("remaining", remaining);
      console.log("chunkCount", chunkCount);
      // console.log("pages",pages[0]);

      for (const page of pages) {
        if (remaining <= 0) break;

        const pageMeta = (page.metadata || {}) as Record<string, unknown>;
        const title = String(
          pageMeta.title || source.title || "Knowledge",
        ).slice(0, 180);
        const sourceUrl = pageKey(page, source.uri);
        const storageKey = String(pageMeta.storageKey || "");
        const fileName = String(pageMeta.fileName || "");
        const document = await aiKnowledgeRepository.createDocument({
          organizationId: source.organizationId,
          accountId: source.accountId,
          agentId: source.agentId as Types.ObjectId,
          sourceId: source._id as Types.ObjectId,
          type: source.type,
          title,
          sourceUrl: sourceUrl.startsWith("http") ? sourceUrl : "",
          mimeType:
            source.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE
              ? "application/pdf"
              : "text/plain",
          content: page.pageContent.slice(0, AI_KNOWLEDGE_FILE.MAX_TEXT_CHARS),
          storageKey,
          status: AI_KNOWLEDGE_SOURCE_STATUS.PROCESSING,
          contentHash: checksumFor([page.pageContent]),
          metadata: {
            source: sourceUrl,
            fileName,
          },
          chunkCount: 0,
          processedAt: null,
        });

        const pieces = (await this.splitter.splitDocuments([page])).slice(
          0,
          remaining,
        );
        console.log("pieces", pieces);
        remaining -= pieces.length;
        const ids = pieces.map(
          (_, index) => `${String(document._id)}-${index}`,
        );

        const vectors = pieces.map((piece, index) => {
          const metadata: Record<string, string> = {
            organizationId,
            accountId,
            agentId,
            sourceId: String(source._id),
            documentId: String(document._id),
            chunkId: ids[index],
            sourceType: source.type,
            title,
          };
          if (sourceUrl.startsWith("http")) metadata.sourceUrl = sourceUrl;
          if (fileName) metadata.fileName = fileName;
          return new Document({ pageContent: piece.pageContent, metadata });
        });

        if (vectors.length)
          await aiKnowledgeVectorService.upsert(namespace, vectors, ids);

        await aiKnowledgeRepository.replaceSourceChunks(
          pieces.map((piece, index) => ({
            organizationId,
            accountId,
            agentId,
            sourceId: String(source._id),
            documentId: String(document._id),
            content: piece.pageContent,
            chunkIndex: index,
            vectorId: ids[index],
            metadata: vectors[index].metadata,
          })),
        );
        document.chunkCount = pieces.length;
        document.status = AI_KNOWLEDGE_SOURCE_STATUS.READY;
        document.processedAt = new Date();
        await aiKnowledgeRepository.saveDocument(document);
        chunkCount += pieces.length;
      }

      if (!chunkCount) {
        throw new KnowledgeIngestError(
          source.type === AI_KNOWLEDGE_SOURCE_TYPE.URL
            ? "We couldn't find enough readable information on this website."
            : source.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE
              ? "We couldn't find enough readable information in this file."
              : "Please paste the information you want Kyra to learn.",
          "empty_document",
        );
      }

      source.checksum = fingerprint;
      source.documentCount = pages.length;
      source.chunkCount = chunkCount;
      source.status = AI_KNOWLEDGE_SOURCE_STATUS.READY;
      source.progressMessage = "Knowledge ready";
      source.errorMessage = "";
      await aiKnowledgeRepository.saveSource(source);
      return source;
    } catch (error) {
      logger.error("AI_KNOWLEDGE_INGEST_FAILED", {
        sourceId: String(source._id),
        accountId: String(source.accountId),
        error: error instanceof Error ? error.message : String(error),
      });
      source.status = AI_KNOWLEDGE_SOURCE_STATUS.FAILED;
      source.progressMessage = "";
      source.errorMessage = friendlyKnowledgeError(error);
      await aiKnowledgeRepository.saveSource(source);
      throw error;
    }
  }

  private async loadPages(source: AiKnowledgeSource) {
    try {
      if (source.type === AI_KNOWLEDGE_SOURCE_TYPE.URL) {
        return aiKnowledgeLoaderFactory.loadWebsite(source.uri);
      }
      if (source.type === AI_KNOWLEDGE_SOURCE_TYPE.FILE) {
        const stored = await aiKnowledgeRepository.listDocuments(
          String(source._id),
        );
        const file = stored.find((item) => item.storageKey);
        if (!file?.storageKey) {
          throw new KnowledgeIngestError(
            "We couldn't read this file. Please upload it again.",
            "missing_file",
          );
        }
        const buffer = await aiKnowledgeFileStore.read(file.storageKey);
        const dir = await mkdtemp(join(tmpdir(), "kyra-pdf-"));
        const path = join(dir, "source.pdf");
        try {
          await writeFile(path, buffer);
          const pages = await aiKnowledgeLoaderFactory.loadPdf(path);
          pages.forEach((page) => {
            page.metadata = {
              ...page.metadata,
              title: file.title || source.title,
              storageKey: file.storageKey,
              fileName: String(file.metadata?.fileName || source.uri || ""),
            };
          });
          return pages;
        } finally {
          await rm(dir, { recursive: true, force: true });
        }
      }

      const stored = await aiKnowledgeRepository.listDocuments(
        String(source._id),
      );
      const text =
        stored.map((item) => item.content).join("\n\n") || source.content;
      return aiKnowledgeLoaderFactory.loadText(source.title, text);
    } catch (error) {
      throw error;
    }
  }

  private async clearIndexed(source: AiKnowledgeSource) {
    await aiKnowledgeVectorService.deleteBySource(
      aiKnowledgeVectorService.namespace(
        String(source.organizationId),
        String(source.accountId),
        String(source.agentId),
      ),
      String(source._id),
      {
        organizationId: String(source.organizationId),
        accountId: String(source.accountId),
        agentId: String(source.agentId),
      },
    );

    await aiKnowledgeRepository.deleteChunksBySource(
      String(source._id),
      String(source.accountId),
      String(source.organizationId),
    );

    await aiKnowledgeRepository.deleteDocumentsBySource(
      String(source._id),
      String(source.accountId),
    );
  }
}

export const aiKnowledgeIngestionService = new AiKnowledgeIngestionService();
