import { z } from "zod";
import { ZBaseEntity } from "./base.type";

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const TASK_ENTITY_TYPES = [
  "lead",
  "contact",
  "deal",
  "campaign",
  "conversation",
] as const;

export const TASK_SOURCE_TYPES = ["manual", "automation", "system"] as const;

export const taskSourceSchema = z.object({
  type: z.enum(TASK_SOURCE_TYPES).default("manual"),

  automationId: z.string().optional(),
});

export const taskSchema = ZBaseEntity.extend({
  organizationId: z.string(),

  accountId: z.string(),

  title: z.string().trim().min(1, "Task title is required"),

  description: z.string().optional(),

  status: z.enum(TASK_STATUSES).default("pending"),

  priority: z.enum(TASK_PRIORITIES).default("medium"),

  dueDate: z.union([z.date(), z.string()]).optional(),

  completedAt: z.union([z.date(), z.string()]).optional(),

  assignedTo: z.string().optional(),

  assignedBy: z.string().optional(),

  entityType: z.enum(TASK_ENTITY_TYPES),

  entityId: z.string(),

  source: taskSourceSchema.optional().default({
    type: "manual",
  }),

  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export type TaskDto = z.infer<typeof taskSchema>;
