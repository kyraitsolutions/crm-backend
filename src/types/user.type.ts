import { z } from "zod";

export const ZGoogleUserSchema = z.object({
  id: z.string(),
  emails: z.array(z.object({ value: z.string() })),
  photos: z.array(z.object({ value: z.string() })),
});

export const ZUserSchema = z.object({
  email: z.string(),
  googleId: z.string(),
  id: z.string(),
  password: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  roleId: z.string(),
  onboarding: z.boolean().default(false),
  address: z
    .object({
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      pincode: z.string().nullable().optional(),
      addressLine1: z.string().nullable().optional(),
      addressLine2: z.string().nullable().optional(),
    })
    .optional(),
});

export type TUser = z.infer<typeof ZUserSchema>;
export type TGoogleUser = z.infer<typeof ZGoogleUserSchema>;
