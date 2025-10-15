import {z} from "zod"

export const ZAccountSchema=z.object({
    id:z.string(),
    userId:z.string(),
    accountName:z.string(),
    email:z.string(),
    status:z.string(),
    createdAt:z.string(),
    updatedAt:z.string()
});

export const ZCreateAccountSchema=z.object({
    userId:z.string(),
    accountName:z.string(),
    email:z.string(),
    status:z.string()
});

export type TAccount=z.infer<typeof ZAccountSchema>;
export type TCreateAccount=z.infer<typeof ZCreateAccountSchema>;