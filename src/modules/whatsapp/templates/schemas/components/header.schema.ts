import { z } from "zod";
import { MediaSchema } from "../media.schema.js";
import { HeaderExampleSchema } from "../example.schema.js";

const HeaderTextSchema = z.object({
  type: z.literal("HEADER"),
  format: z.literal("TEXT"),
  text: z.string(),
  example: HeaderExampleSchema.optional(),
});

const HeaderMediaSchema = z.object({
  type: z.literal("HEADER"),
  format: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "LOCATION"]),
  media: MediaSchema,
});

export const HeaderComponentSchema = z.discriminatedUnion("format", [
  HeaderTextSchema,
  HeaderMediaSchema,
]);

export type THeaderComponent = z.infer<typeof HeaderComponentSchema>;
