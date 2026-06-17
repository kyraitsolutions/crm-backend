import { z } from "zod";
import { ZBaseEntity } from "./base.type";

export const activityActorSchema = z
  .object({
    type: z.enum(["user", "automation", "system", "api"]),
    id: z.string().optional(),
    name: z.string().optional(),
  })
  .default({ type: "system" });

export const activityChangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const activitySourceSchema = z.object({
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  apiKeyId: z.string().optional(),
});

export const activityLogSchema = ZBaseEntity.extend({
  organizationId: z.string(),
  accountId: z.string().optional(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  actor: activityActorSchema,
  changes: activityChangeSchema.default({}),
  metadata: z.record(z.any(), z.any()).default({}).optional(),
  source: activitySourceSchema.optional().default({}),
});

export type TActivityLog = z.infer<typeof activityLogSchema>;
