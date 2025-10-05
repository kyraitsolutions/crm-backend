import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 101 }),
  googleId: varchar("google_id", { length: 255 }).unique(),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  roleId: integer("role_id")
    .references(() => roles.id)
    .default(3),
});

export const roles = pgTable("roles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// export const chatbotStatus = pgTable("chatbot_status", {
//   id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar("name").notNull().unique(),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull(),
// });

// export const chatbots = pgTable("chatbots", {
//   id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar("name").notNull(),
//   description: text("description"),
//   ownerId: integer("owner_id")
//     .references(() => users.id)
//     .notNull(),
//   status: integer("status")
//     .references(() => chatbotStatus.id)
//     .notNull()
//     .default(1),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull(),
// });

// export const knowledgeSourcesType = pgTable("knowledge_sources_type", {
//   id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
//   name: varchar("name").notNull(),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull(),
// });

// export const chatbotKnowledgeSources = pgTable("chatbot_knowledge_sources", {
//   id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
//   chatbotId: integer("chatbot_id")
//     .references(() => chatbots.id)
//     .notNull(),
//   knowledgeSourcesTypeId: integer("knowledge_sources_type_id")
//     .references(() => knowledgeSourcesType.id)
//     .notNull(),
//   createdAt: timestamp("created_at").defaultNow().notNull(),
//   updatedAt: timestamp("updated_at").defaultNow().notNull(),
// });

// export const chatbotsSuggestedQuestions = pgTable(
//   "chatbots_suggested_questions",
//   {
//     id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
//     chatbotId: integer("chatbot_id")
//       .references(() => chatbots.id)
//       .notNull(),
//     question: varchar("question").notNull(),
//     createdAt: timestamp("created_at").defaultNow().notNull(),
//     updatedAt: timestamp("updated_at").defaultNow().notNull(),
//   }
// );

// export const chatbotsConversationSettings = pgTable(
//   "chatbots_conversation_settings",
//   {
//     id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
//     chatbotId: integer("chatbot_id")
//       .references(() => chatbots.id)
//       .notNull(),
//     welcomeMessage: text("welcome_message"),
//     fallbackResponse: text("fallback_response"),
//     emailCapture: boolean("email_capture").default(false),
//     createdAt: timestamp("created_at").defaultNow().notNull(),
//     updatedAt: timestamp("updated_at").defaultNow().notNull(),
//   }
// );
