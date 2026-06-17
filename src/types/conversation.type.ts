import { z } from "zod";
import { IdentifiersSchema, PlatformSchema } from "./share.type";

export const ConversationStatusSchema = z.enum([
  "open",
  "pending",
  "resolved",
  "closed",
  "archived",
]);

export const MessageFromSchema = z.enum(["me", "bot", "user", "system"]);

export const LastMessageSchema = z.object({
  messageId: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  type: z.string().default("text"),
  from: MessageFromSchema.default("user"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export const ConversationSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  visitorId: z.string(),
  platform: PlatformSchema,
  identifiers: IdentifiersSchema,
  status: ConversationStatusSchema.default("open"),
  lastMessage: LastMessageSchema.optional(),
  unreadCount: z.number().default(0),
  tags: z.string().nullable().optional(),
  totalMessages: z.number().default(0),
  isBlocked: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  metadata: z.record(z.any(), z.any()).default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TConversationStatus = z.infer<typeof ConversationStatusSchema>;

export type TMessageFrom = z.infer<typeof MessageFromSchema>;

export type TLastMessage = z.infer<typeof LastMessageSchema>;

export type TConversation = z.infer<typeof ConversationSchema>;
