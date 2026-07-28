import { z } from "zod";

export const VariableSourceTypeSchema = z.enum([
  "CONTACT",
  "LEAD",
  "BOOKING",
  "CUSTOM",
  "STATIC",
  "API",
]);

export const VariableMappingSchema = z.object({
  variable: z.string(),
  component: z.enum(["HEADER", "BODY", "BUTTONS"]),
  sourceType: VariableSourceTypeSchema,
  sourceKey: z.string().nullable(),
  fallbackValue: z.string().default(""),
});

export type TVariableMapping = z.infer<typeof VariableMappingSchema>;
