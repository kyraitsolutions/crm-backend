import { z } from "zod";

import { ZBaseEntity } from "../../../../types/base.type.js";

import { TemplateComponentSchema } from "./components/index.js";
import { VariableMappingSchema } from "./variable.schema.js";
import {
  TemplateCategory,
  TemplateParameterFormat,
  TemplateStatus,
} from "../types/template.enums.js";

export const TemplateSchema = ZBaseEntity.extend({
  accountId: z.string(),
  integrationId: z.string().optional(),
  wabaId: z.string(),
  phoneNumberId: z.string(),
  metaTemplateId: z.string().nullable(),
  name: z.string(),
  language: z.string(),
  category: z.enum(TemplateCategory),
  parameterFormat: z.enum(TemplateParameterFormat),
  status: z.enum(TemplateStatus).default("DRAFT"),

  components: z.array(TemplateComponentSchema),
  variableMappings: z.array(VariableMappingSchema).default([]),
});
