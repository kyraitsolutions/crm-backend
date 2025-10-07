import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  jsonb,
  vector,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./user.table";

export const chatbots = pgTable(
  "chatbot",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name").notNull(),
    description: text("description"),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [index("chatbot_user_id_idx").on(table.userId)]
);

export const chatbotKnowledgeSources = pgTable(
  "chatbot_knowledge_sources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    chatbotId: integer("chatbot_id")
      .references(() => chatbots.id, { onDelete: "cascade" })
      .notNull(),
    type: integer("type"),
    name: varchar("name"),
    sourceUrl: text("source_url"),
    rawText: text("raw_text"),

    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [index("knowledge_sources_chatbot_id_idx").on(table.chatbotId)]
);

export const chatbotKnowledgeChunks = pgTable(
  "chatbot_knowledge_chunks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    chatbotId: integer("chatbot_id")
      .references(() => chatbots.id, { onDelete: "cascade" })
      .notNull(),
    sourceId: integer("source_id")
      .references(() => chatbotKnowledgeSources.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),

    embedding: vector("embedding", { dimensions: 1536 }),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count"),
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("knowledge_chunks_source_id_idx").on(table.sourceId),
    index("knowledge_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const chatbotSuggestedQuestions = pgTable(
  "chatbot_suggested_questions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    chatbotId: integer("chatbot_id")
      .references(() => chatbots.id, { onDelete: "cascade" })
      .notNull(),
    question: text("question").notNull(),
    order: integer("order").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [index("suggested_questions_chatbot_id_idx").on(table.chatbotId)]
);

export const chatbotConversationSettings = pgTable(
  "chatbot_conversation_settings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    chatbotId: integer("chatbot_id")
      .references(() => chatbots.id, { onDelete: "cascade" })
      .notNull(),
    welcomeMessage: text("welcome_message"),
    fallbackResponse: text("fallback_response"),
    emailCapture: boolean("email_capture").default(false),

    systemPrompt: text("system_prompt"),
    temperature: integer("temperature"),
    maxTokens: integer("max_tokens"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index("conversation_settings_chatbot_id_idx").on(table.chatbotId),
    unique("conversation_settings_chatbot_id_unique").on(table.chatbotId),
  ]
);

export const chatbotTheme = pgTable(
  "chatbot_theme",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    chatbotId: integer("chatbot_id")
      .references(() => chatbots.id)
      .notNull(),
    theme: jsonb("theme").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (table) => [index("theme_chatbot_id_idx").on(table.chatbotId)]
);
