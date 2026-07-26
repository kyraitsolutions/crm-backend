import { z } from "zod";

export const FooterComponentSchema = z.object({
  type: z.literal("FOOTER"),
  text: z.string(),
});

export type TFooterComponent = z.infer<typeof FooterComponentSchema>;
