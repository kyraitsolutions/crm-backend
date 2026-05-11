import { z } from "zod";
import { IdentifiersSchema, PlatformSchema } from "./share.type";
export const VisitorSchema = z.object({
  accountId: z.string(),
  visitorId: z.string(),
  platform: PlatformSchema,
  identifiers: IdentifiersSchema,
  displayName: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
  phone: z.string().nullable().optional(),
  firstSeenAt: z.date().optional(),
  lastSeenAt: z.date().optional(),
  status: z.enum(["online", "offline"]).default("online"),
  totalConversations: z.number().default(0),
  metadata: z.record(z.any(), z.any()).default({}).optional(),
  isBlocked: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  totalVisit: z.number().default(1),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TVisitor = z.infer<typeof VisitorSchema>;
