// schemas/media.schema.ts
import { z } from "zod";

export const MediaSchema = z.object({
  link: z.url(),
  name: z.string().min(1),
  size: z.number().positive(),
  mimeType: z.string().min(1),
});

export type TMedia = z.infer<typeof MediaSchema>;
