import { z } from "zod";

export const ZFormFieldSchema = z.object({
  name: z.boolean().optional(),
  phoneNumber: z.boolean().optional(),
  email: z.boolean().optional(),
  message: z.boolean().optional(),
  customFields: z
    .array(
      z.object({
        label: z.string(),
        key: z.string(),
        required: z.boolean().default(false),
      })
    )
    .optional(),
});

export const ZCreateFormSchema = z.object({
  userId:z.string(),
  accountId: z.string(), // or z.string().uuid() if you're using UUIDs
  formName: z.string().min(1, "Form name is required"),
  formTitle: z.string().min(1, "Form title is required"),
  formDescription: z.string().optional(),
  headerImage: z.string().url().optional(),
  formFields: ZFormFieldSchema,
  successMessage: z.string().optional(),
  successCTA: z
    .enum(["phone", "whatsapp", "sms", "email", "open_website"])
    .optional(),
  successCTADestination: z.string().optional(),
});

export type TCreateForm = z.infer<typeof ZCreateFormSchema>;
