import { z } from "zod";

export const ButtonSchema = z.object({
  type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE", "OTP"]),
  text: z.string().optional(),
  otp_type: z.enum(["COPY_CODE", "ONE_TAP", "ZERO_TAP"]).optional(),
  url: z.string().optional(),
  phoneNumber: z.string().optional(),
  phone_number: z.string().optional(),
});

export const ButtonsComponentSchema = z.object({
  type: z.literal("BUTTONS"),
  buttons: z.array(ButtonSchema),
});

export type TButtonsComponent = z.infer<typeof ButtonsComponentSchema>;
