import {z} from "zod"

export const ZUserProfileSchema=z.object({
    id:z.string(),
    userId:z.string(),
    firstName:z.string(),
    lastName:z.string(),
    organizationName:z.string(),
    accountType: z.string().default("individual"),
    createdAt:z.string(),
    updatedAt:z.string()
})

export const ZCreateUserProfileSchema=z.object({
    userId:z.string(),
    firstName:z.string(),
    lastName:z.string(),
    organizationName:z.string(),
    accountType:z.string(),
})

export type TUserProfile=z.infer<typeof ZUserProfileSchema>;
export type TCreateUserProfile=z.infer<typeof ZCreateUserProfileSchema>;

