import { z } from "zod";
import { BodyExampleSchema } from "../example.schema.js";

export const BodyComponentSchema = z.object({
  type: z.literal("BODY"),
  text: z.string().optional(),
  example: BodyExampleSchema.optional(),
  add_security_recommendation: z.boolean().optional(),
});

export type TBodyComponent = z.infer<typeof BodyComponentSchema>;
