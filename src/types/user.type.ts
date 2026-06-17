import { z } from "zod";
import { ZBaseEntity } from "./base.type";

// user
export const ZUserSchema = ZBaseEntity.extend({
  email: z.string(),
  password: z.string().nullable().optional(),
  googleId: z.string().optional(),
  role: z
    .object({ id: z.string(), name: z.string(), level: z.number() })
    .optional(),
  onboarding: z.boolean().default(false).optional(),
  token: z.string().nullable().optional(),
});

export const ZGoogleUserSchema = z.object({
  id: z.string(),
  emails: z.array(z.object({ value: z.string() })),
  photos: z.array(z.object({ value: z.string() })),
});

// user profile
export const ZAddressSchema = z.object({
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
});
export const ZUserProfileSchema = ZBaseEntity.extend({
  userId: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profilePicture: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: ZAddressSchema.optional(),
});

export const ZUserAggregateSchema = ZBaseEntity.extend({
  email: z.string(),
  roleId: z.string().nullable().optional(),
  onboarding: z.boolean().default(false).optional(),
  userProfile: ZUserProfileSchema.optional(),
  organization: z.object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
  }),
});

export const ZUserLoginSchema = ZUserSchema.pick({
  email: true,
  password: true,
})
  .extend({
    password: z.string(), // override → required
  })
  .strict();

export type TAddress = z.infer<typeof ZAddressSchema>;
export type TUserProfile = z.infer<typeof ZUserProfileSchema>;
export type TUser = z.infer<typeof ZUserSchema>;
export type TUserAggregate = z.infer<typeof ZUserAggregateSchema>;

export type TUserLogin = z.infer<typeof ZUserLoginSchema>;
export type TGoogleUser = z.infer<typeof ZGoogleUserSchema>;
