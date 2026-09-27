import * as cheerio from "cheerio";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { AI_KNOWLEDGE_CRAWL } from "../constants/knowledge.constant.js";
import { KnowledgeIngestError } from "../utils/knowledge-error.util.js";

const websiteText = (html: string) => {
  const faqs: string[] = [];
  const decoded = html.replace(/\\"/g, '"').replace(/\\n/g, " ");
  const pattern =
    /"question"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"answer"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(decoded))) {
    const question = match[1].replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
    const answer = match[2].replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
    if (question.length < 8 || answer.length < 12) continue;
    faqs.push(`Question: ${question}\nAnswer: ${answer}`);
  }
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe").remove();
  const title = $("title").first().text().replace(/\s+/g, " ").trim();
  const body = $("body")
    .text()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return [title, faqs.join("\n\n"), body].filter(Boolean).join("\n\n");
};

const readable = (docs: Document[]) =>
  docs
    .map((doc) => {
      doc.pageContent = String(doc.pageContent || "").replace(/\s+\n/g, "\n").trim();
      return doc;
    })
    .filter((doc) => doc.pageContent.length >= 40);

export class AiKnowledgeLoaderFactory {
  async loadWebsite(url: string) {
   try {
    const loader = new RecursiveUrlLoader(url, {
      extractor: websiteText,
      maxDepth: AI_KNOWLEDGE_CRAWL.MAX_DEPTH,
      preventOutside: true,
      timeout: AI_KNOWLEDGE_CRAWL.REQUEST_TIMEOUT_MS,
      excludeDirs: [
        "login",
        "signin",
        "signup",
        "register",
        "cart",
        "checkout",
        "account",
        "admin",
        "dashboard",
      ],
    });

    console.log("loader", loader);
    const docs = readable(await loader.load()).slice(0, AI_KNOWLEDGE_CRAWL.MAX_PAGES);
    console.log("docs", docs[0]);
    
    if (!docs.length) {
      throw new KnowledgeIngestError(
        "We couldn't find enough readable information on this website.",
        "empty_site",
      );
    }
    return docs;
   } catch (error) {
    console.log("error", error);
    throw error;
   }
  }

  async loadPdf(filePath: string) {
    try {
      const docs = readable(await new PDFLoader(filePath, { splitPages: true }).load());
      if (!docs.length) {
        throw new KnowledgeIngestError(
          "We couldn't find enough readable information in this file.",
          "empty_file",
        );
      }
      return docs;
    } catch (error) {
      if (error instanceof KnowledgeIngestError) throw error;
      throw new KnowledgeIngestError(
        "We couldn't read this file. Please upload a valid PDF.",
        "bad_pdf",
      );
    }
  }

  loadText(title: string, content: string) {
    const text = String(content || "").trim();
    if (text.length < 8) {
      throw new KnowledgeIngestError(
        "Please paste the information you want Kyra to learn.",
        "empty_text",
      );
    }
    return [
      new Document({
        pageContent: text,
        metadata: { source: title, title },
      }),
    ];
  }
}

export const aiKnowledgeLoaderFactory = new AiKnowledgeLoaderFactory();
