import { z } from "zod";

export const ButtonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "OTP"]),
  text: z.string(),
  url: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export const ButtonsComponentSchema = z.object({
  type: z.literal("BUTTONS"),
  buttons: z.array(ButtonSchema),
});

export type TButtonsComponent = z.infer<typeof ButtonsComponentSchema>;
