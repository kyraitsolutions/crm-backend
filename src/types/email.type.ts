import { z } from "zod";
import { TemplateCategory } from "../enums/email.enum";

export const ZEmailTemplateSchema = z.object({
    accountId: z.string(),

    name: z
        .string()
        .min(1, "Template name is required")
        .trim(),

    subject: z
        .string()
        .min(1, "Subject is required")
        .trim(),

    preheader: z
        .string()
        .trim()
        .optional(),

    // Content
    html: z
        .string()
        .min(1, "HTML content is required"),

    text: z
        .string()
        .optional(),

    design: z
        .any()
        .optional(),

    // Variables like {{name}}
    variables: z
        .array(z.string())
        .optional(),

    // Metadata
    category: z
        .nativeEnum(TemplateCategory)
        .optional(),

    tags: z
        .array(z.string())
        .optional(),

    // UI
    thumbnail: z
        .string()
        .url()
        .optional(),

    // AI Support
    generatedBy: z
        .enum(["ai", "user"])
        .optional(),

    aiPrompt: z
        .string()
        .optional(),

    // Versioning
    status: z
        .enum(["draft", "active", "archived"])
        .default("draft"),

    version: z
        .number()
        .default(1),

    lastUsedAt: z
        .date()
        .optional(),

    createdBy: z
        .string()
        .optional(),
});

export const ZCreateEmailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().min(1),

  preheader: z.string().optional(),
  text: z.string().optional(),
  design: z.any().optional(),

  tags: z.array(z.string()).optional(),
  generatedBy: z
        .enum(["ai", "user"])
        .optional(),
  category: z
    .enum(["marketing", "transactional", "follow-up", "newsletter"])
    .optional()
});
export type TEmailTemplate = z.infer<typeof ZEmailTemplateSchema>;