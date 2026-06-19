import { z } from "zod";
import { ZBaseEntity } from "./base.type.js";

export const organizationSchema = ZBaseEntity.extend({
  name: z.string().min(1),
  email: z.email(),
  slug: z.string().min(1),

  createdBy: z.string(),
  logo: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),

  size: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).optional(),
  phone: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      pincode: z.string().optional(),
    })
    .optional(),

  billingEmail: z.email().optional(),

  isActive: z.boolean().default(true).optional(),

  settings: z
    .object({
      allowInvites: z.boolean().default(true),
      requireEmailVerification: z.boolean().default(false),
    })
    .optional(),
});

export const organizationMemberSchema = ZBaseEntity.extend({
  organizationId: z.string(),
  userId: z.string(),
  roleId: z.string().min(1),
  isActive: z.boolean().default(true).optional(),
  invitedBy: z.string().optional(),
});

// export const organizationMemberResponseSchema = ZBaseEntity.extend({
//   userId: z.string(),
//   roleId: z.string(),
//   email: z.email(),
//   firstName: z.string(),
//   lastName: z.string().optional(),
//   status: z.boolean(),
//   accounts: z.array(z.object({ accountId: z.string(), roleId: z.string() })),
// });

export type TOrganization = z.infer<typeof organizationSchema>;
export type TOrganizationMember = z.infer<typeof organizationMemberSchema>;
// export type TOrganizationMemberResponse = z.infer<
//   typeof organizationMemberResponseSchema
// >;
