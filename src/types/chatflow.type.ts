import { z } from "zod";

// chatflow node data types
export const chatFlowNodeDataSchema = z.object({
  label: z.string().default(""),
  type: z.string().default(""),
  payload: z.any().optional(),
});

// chatflow node types
export const chatFlowNodeSchema = z.object({
  id: z.string(), // use UUID from frontend
  type: z.enum(["chat", "form"]).default("chat"),
  position: z
    .object({
      x: z.number().default(0),
      y: z.number().default(0),
    })
    .default({ x: 0, y: 0 }),
  width: z.number().optional().default(250),
  height: z.number().optional().default(100),
  selected: z.boolean().optional().default(false),
  dragging: z.boolean().optional().default(false),
  data: chatFlowNodeDataSchema.default({ label: "", type: "", payload: null }),
});

// chatflow edge types
export const chatFlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  animated: z.boolean().optional().default(false),
  sourceHandle: z.string().nullable().optional().default(null),
  targetHandle: z.string().nullable().optional().default(null),
});

// chatflow types
export const chatFlowSchema = z.object({
  accountId: z.string(),
  organizationId: z.string(),
  name: z.string().trim().max(100),
  description: z.string().max(1024).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  nodes: z.array(chatFlowNodeSchema).default([]),
  edges: z.array(chatFlowEdgeSchema).default([]),
  createdBy: z.string(),
  version: z.number().default(1),
  isPublished: z.boolean().default(false),
  publishedAt: z.date().nullable().default(null),
  isDeleted: z.boolean().default(false),
  deletedAt: z.date().nullable().default(null),
});

export type TChatFlowNode = z.infer<typeof chatFlowNodeSchema>;
export type TChatFlowEdge = z.infer<typeof chatFlowEdgeSchema>;
export type TChatFlow = z.infer<typeof chatFlowSchema>;
