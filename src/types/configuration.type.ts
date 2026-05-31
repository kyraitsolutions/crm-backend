import { z } from "zod";
import { ZBaseEntity } from "./base.type";

const ConfigValueSchema = z.object({
  _id: z.string().optional(),
  key: z.string().trim().min(1, "Key is required").toLowerCase(),
  label: z.string().trim().min(1, "Label is required"),
  color: z.string().default("#6B7280"),
  order: z.number().int().nonnegative().default(0),
  system: z.boolean().default(false),
  editable: z.boolean().default(true),
  deletable: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).default({}),
});

const ConfigDefinitionSchema = ZBaseEntity.extend({
  organizationId: z.string(),
  scope: z.string().default("organization"),
  module: z.string().trim().toLowerCase(),
  configType: z.string().trim().toLowerCase(),
  name: z.string().trim().min(1, "Name is required"),
  values: z.array(ConfigValueSchema).default([]),
  createdBy: z.string(),
});

export type TConfigValue = z.infer<typeof ConfigValueSchema>;
export type TConfigDefinition = z.infer<typeof ConfigDefinitionSchema>;
