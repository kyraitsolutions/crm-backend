import { HttpError } from "../../../../utils/http.error.js";
import { WhatsAppAiAgentKnowledgeModel } from "../models/whatsapp-ai-agent-knowledge.model.js";

const tokenize = (text: string) =>
  String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);

export class AiAgentKnowledgeService {
  async list(accountId: string) {
    const docs = await WhatsAppAiAgentKnowledgeModel.find({
      accountId,
      status: "active",
    })
      .sort({ updatedAt: -1 })
      .lean();
    return docs.map((doc) => this.serialize(doc));
  }

  async create(params: {
    organizationId: string;
    accountId: string;
    title: string;
    content: string;
    tags?: string[];
  }) {
    const title = String(params.title || "").trim();
    const content = String(params.content || "").trim();
    if (!title || !content) {
      throw HttpError.badRequest("Knowledge title and content are required");
    }
    const created = await WhatsAppAiAgentKnowledgeModel.create({
      organizationId: params.organizationId,
      accountId: params.accountId,
      title,
      content,
      tags: (params.tags || []).map((tag) => String(tag).trim()).filter(Boolean),
      status: "active",
    });
    return this.serialize(created.toJSON());
  }

  async update(
    accountId: string,
    id: string,
    payload: { title?: string; content?: string; tags?: string[]; status?: string },
  ) {
    const updated = await WhatsAppAiAgentKnowledgeModel.findOneAndUpdate(
      { _id: id, accountId },
      { $set: payload },
      { new: true },
    );
    if (!updated) throw HttpError.notFound("Knowledge article not found");
    return this.serialize(updated.toJSON());
  }

  async remove(accountId: string, id: string) {
    const deleted = await WhatsAppAiAgentKnowledgeModel.findOneAndDelete({
      _id: id,
      accountId,
    });
    if (!deleted) throw HttpError.notFound("Knowledge article not found");
    return this.serialize(deleted.toJSON());
  }

  async retrieve(accountId: string, query: string, limit = 5) {
    const terms = tokenize(query);
    const articles = await WhatsAppAiAgentKnowledgeModel.find({
      accountId,
      status: "active",
    })
      .select("title content tags")
      .lean();

    if (!articles.length) return [];

    const ranked = articles
      .map((article) => {
        const haystack = `${article.title} ${article.content} ${(article.tags || []).join(" ")}`.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (haystack.includes(term)) score += 2;
        }
        if (!terms.length) score = 1;
        return { article, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (!ranked.length) {
      return articles.slice(0, Math.min(3, articles.length)).map((article) => ({
        id: String(article._id),
        title: article.title,
        content: String(article.content).slice(0, 1200),
        tags: article.tags || [],
      }));
    }

    return ranked.map(({ article }) => ({
      id: String(article._id),
      title: article.title,
      content: String(article.content).slice(0, 1200),
      tags: article.tags || [],
    }));
  }

  private serialize(doc: any) {
    return {
      ...doc,
      id: String(doc.id || doc._id),
    };
  }
}

export const aiAgentKnowledgeService = new AiAgentKnowledgeService();
