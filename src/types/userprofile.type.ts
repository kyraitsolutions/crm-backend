import { z } from "zod";

export const ZUserProfileSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  profilePicture: z.string(),
  address: z.object({
    city: z.string(),
    state: z.string(),
    country: z.string(),
    pincode: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ZCreateUserProfileSchema = z.object({
  userId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),

  phone: z.string().optional(),
  profilePicture: z.string().optional(),

  address: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
    })
    .optional(),
});

export type TUserProfile = z.infer<typeof ZUserProfileSchema>;
export type TCreateUserProfile = z.infer<typeof ZCreateUserProfileSchema>;
