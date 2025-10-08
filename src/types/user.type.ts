import { z } from "zod";

export const ZUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  password: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  googleId: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  roleId: z.number().nullable().optional(),
});
export const ZCreateUserSchema = z.object({
  email: z.string(),
  password: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  googleId: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
});

export const ZUpdateUserSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
});

export type TUser = z.infer<typeof ZUserSchema>;
export type TCreateUser = z.infer<typeof ZCreateUserSchema>;
export type TUpdateUser = z.infer<typeof ZUpdateUserSchema>;
