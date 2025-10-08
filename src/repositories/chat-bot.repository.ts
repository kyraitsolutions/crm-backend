// repositories/chatbot.repository.ts
import { eq } from "drizzle-orm";
import {
  chatbots,
  chatbotKnowledgeSources,
  chatbotKnowledgeChunks,
  chatbotSuggestedQuestions,
  chatbotConversationSettings,
  chatbotTheme,
} from "../db/tables";
import { PgTransaction } from "drizzle-orm/pg-core"; // type

export class ChatbotRepository {
  async createChatbot(
    tx: PgTransaction<any, any, any>,
    data: typeof chatbots.$inferInsert
  ) {
    const [bot] = await tx.insert(chatbots).values(data).returning();
    return bot;
  }

  async addKnowledgeSource(
    tx: PgTransaction<any, any, any>,
    data: typeof chatbotKnowledgeSources.$inferInsert
  ) {
    const [source] = await tx
      .insert(chatbotKnowledgeSources)
      .values(data)
      .returning();
    return source;
  }

  async addKnowledgeChunks(
    tx: PgTransaction<any, any, any>,
    data: (typeof chatbotKnowledgeChunks.$inferInsert)[]
  ) {
    if (!data.length) return [];
    const chunks = await tx
      .insert(chatbotKnowledgeChunks)
      .values(data)
      .returning();
    return chunks;
  }

  async addSuggestedQuestions(
    tx: PgTransaction<any, any, any>,
    data: (typeof chatbotSuggestedQuestions.$inferInsert)[]
  ) {
    if (!data.length) return [];
    const questions = await tx
      .insert(chatbotSuggestedQuestions)
      .values(data)
      .returning();
    return questions;
  }

  async addConversationSettings(
    tx: PgTransaction<any, any, any>,
    data: typeof chatbotConversationSettings.$inferInsert
  ) {
    const [settings] = await tx
      .insert(chatbotConversationSettings)
      .values(data)
      .returning();
    return settings;
  }

  async addTheme(
    tx: PgTransaction<any, any, any>,
    data: typeof chatbotTheme.$inferInsert
  ) {
    const [theme] = await tx.insert(chatbotTheme).values(data).returning();
    return theme;
  }
  async updateChatbot(
    tx: PgTransaction<any, any, any>,
    chatbotId: number,
    data: Partial<typeof chatbots.$inferInsert>
  ) {
    const [bot] = await tx
      .update(chatbots)
      .set(data)
      .where(eq(chatbots.id, chatbotId))
      .returning();
    return bot;
  }

  async updateKnowledgeSource(
    tx: PgTransaction<any, any, any>,
    chatbotId: number,
    data: Partial<typeof chatbotKnowledgeSources.$inferInsert>
  ) {
    const [source] = await tx
      .update(chatbotKnowledgeSources)
      .set(data)
      .where(eq(chatbotKnowledgeSources.chatbotId, chatbotId))
      .returning();
    return source;
  }

  async updateConversationSettings(
    tx: PgTransaction<any, any, any>,
    chatbotId: number,
    data: Partial<typeof chatbotConversationSettings.$inferInsert>
  ) {
    const [settings] = await tx
      .update(chatbotConversationSettings)
      .set(data)
      .where(eq(chatbotConversationSettings.chatbotId, chatbotId))
      .returning();
    return settings;
  }

  async updateTheme(
    tx: PgTransaction<any, any, any>,
    chatbotId: number,
    data: Partial<typeof chatbotTheme.$inferInsert>
  ) {
    const [theme] = await tx
      .update(chatbotTheme)
      .set(data)
      .where(eq(chatbotTheme.chatbotId, chatbotId))
      .returning();
    return theme;
  }

  async deleteKnowledgeChunks(
    tx: PgTransaction<any, any, any>,
    chatbotId: number,
    sourceId: number
  ) {
    return await tx
      .delete(chatbotKnowledgeChunks)
      .where(
        eq(chatbotKnowledgeChunks.chatbotId, chatbotId) &&
          eq(chatbotKnowledgeChunks.sourceId, sourceId)
      );
  }

  async deleteSuggestedQuestions(
    tx: PgTransaction<any, any, any>,
    chatbotId: number
  ) {
    return await tx
      .delete(chatbotSuggestedQuestions)
      .where(eq(chatbotSuggestedQuestions.chatbotId, chatbotId));
  }
}
