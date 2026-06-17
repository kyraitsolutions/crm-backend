import {z} from "zod";




export const ContactStatusSchema=z.enum([
    "subscribed" , "unsubscribed" ,"bounced"
]);
export const ContactSourcesSchema=z.enum(["chatbot", "webform", "google_ads", "manual", "import","instagram","whatsapp","facebook"]);

export const CreateContactSchema=z.object({
    accountId: z.string(),
    name:z.string(),
    email:z.string().email("Invalid email").nullable().optional(),
    phone:z.string().min(10,"Phone number must have 10 digits").max(10,"Phone number must not have more than 10 digits"),
    status:ContactStatusSchema.default("subscribed"),
    tags: z
    .union([z.string(), z.array(z.string())])
    .transform((val) =>
        typeof val === "string" ? [val] : val
    )
    .nullable()
    .optional(),
})
export const ContactSchema=z.object({
    id:z.string(),
    accountId: z.string(),
    name:z.string(),
    email:z.string().nullable().optional(),
    phone:z.string().nullable().optional(),
    status:ContactStatusSchema.default("subscribed"),
    source:ContactSourcesSchema,
     tags: z
    .union([z.string(), z.array(z.string())])
    .transform((val) =>
        typeof val === "string" ? [val] : val
    )
    .nullable()
    .optional(),
    lastActivity:z.date().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type TContact = z.infer<typeof ContactSchema>;
export type TCreateContact = z.infer<typeof CreateContactSchema>;
