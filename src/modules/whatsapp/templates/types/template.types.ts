import { z } from "zod";
import {
  TemplateCategory,
  TemplateComponentType,
  TemplateParameterFormat,
  TemplateStatus,
} from "./template.enums.js";
import { ZBaseEntity } from "../../../../types/base.type.js";

export const TemplateVariableMappingSchema = z.object({
  variable: z.string(),
  value: z.string(),
});

export const TemplateComponentSchema = z.object({
  type: z.nativeEnum(TemplateComponentType),
  text: z.string().optional(),
  format: z.string().optional(),
  variableMappings: z.array(TemplateVariableMappingSchema).default([]),
});

export const TemplateSchema = ZBaseEntity.extend({
  accountId: z.string(),
  integrationId: z.string().optional(),
  whatsappAccountId: z.string().optional(),

  wabaId: z.string(),
  phoneNumberId: z.string(),

  metaTemplateId: z.string(),

  name: z.string(),

  language: z.string(),

  category: z.nativeEnum(TemplateCategory),

  parameterFormat: z.nativeEnum(TemplateParameterFormat),
  status: z.nativeEnum(TemplateStatus),
  components: z.array(TemplateComponentSchema),
});

export type TTemplate = z.infer<typeof TemplateSchema>;
