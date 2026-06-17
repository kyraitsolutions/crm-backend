import { z } from "zod";

export const ZAccountSchema = z.object({
  id: z.string(),
  createdBy: z.string(),
  organizationId: z.string(),
  accountName: z.string(),
  email: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ZCreateAccountSchema = z.object({
  createdBy: z.string(),
  organizationId: z.string(),
  accountName: z.string(),
  email: z.string(),
  status: z.string(),
});

export type TAccount = z.infer<typeof ZAccountSchema>;
export type TCreateAccount = z.infer<typeof ZCreateAccountSchema>;
