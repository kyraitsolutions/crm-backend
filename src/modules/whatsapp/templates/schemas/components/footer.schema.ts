import { z } from "zod";

export const FooterComponentSchema = z.object({
  type: z.literal("FOOTER"),
  text: z.string().optional(),
  code_expiration_minutes: z.number().int().min(1).max(90).optional(),
});

export type TFooterComponent = z.infer<typeof FooterComponentSchema>;
