import { z } from "zod";

export const searchKnowledgeArgsSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(10).optional(),
});

export const updateContactArgsSchema = z.object({
  contactId: z.string().optional(),
  fields: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    })
    .default({}),
});

export const createLeadArgsSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().optional(),
});

export const updateLeadArgsSchema = z.object({
  leadId: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).default({}),
  stage: z.string().optional(),
});

export const escalateToHumanArgsSchema = z.object({
  reason: z.string().min(1),
  summary: z.string().optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
});

export const customApiArgsSchema = z.object({
  body: z.record(z.string(), z.unknown()).optional(),
  pathParams: z.record(z.string(), z.string()).optional(),
  id: z.string().optional(),
  query: z.string().optional(),
});
