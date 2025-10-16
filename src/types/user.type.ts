import { z } from "zod";

export const ZUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  password: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  googleId: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  roleId: z.string().nullable().optional(),
  isOnboardingCompleted: z.boolean().default(false),
  accountType: z.string().default("individual"),
});
export const ZCreateUserSchema = z.object({
  email: z.string(),
  password: z.string().nullable().optional(),
  googleId: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
});

export const ZUpdateUserSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
});

export const ZUserProfileSchema = z.object({
  userId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  organizationName: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  accountType: z.string().default("individual"),
});

export type TUser = z.infer<typeof ZUserSchema>;
export type TUserProfile = z.infer<typeof ZUserProfileSchema>;
export type TCreateUser = z.infer<typeof ZCreateUserSchema>;
export type TUpdateUser = z.infer<typeof ZUpdateUserSchema>;
