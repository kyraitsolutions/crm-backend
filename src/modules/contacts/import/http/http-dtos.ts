import { z } from "zod";
import { IMPORT_MAX_FILE_BYTES } from "../constants/import.constant.js";
import { StartImportRequestSchema } from "../types/import.types.js";

export const CreateImportBodySchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(IMPORT_MAX_FILE_BYTES),
  contentType: z.string().min(1).max(128),
});

export const ListImportsQuerySchema = z.object({
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const StartImportHttpBodySchema = StartImportRequestSchema;

export type CreateImportBody = z.infer<typeof CreateImportBodySchema>;
export type ListImportsQuery = z.infer<typeof ListImportsQuerySchema>;
