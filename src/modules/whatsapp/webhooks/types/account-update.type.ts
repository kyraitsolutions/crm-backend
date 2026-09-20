import { z } from "zod";

export const WhatsAppAccountUpdateValueSchema = z
  .object({
    event: z.string(),
    phone_number: z.string().optional(),
    waba_info: z
      .object({
        waba_id: z.string().optional(),
        owner_business_id: z.string().optional(),
        partner_app_id: z.string().optional(),
        solution_id: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type TWhatsAppAccountUpdateValue = z.infer<
  typeof WhatsAppAccountUpdateValueSchema
>;
