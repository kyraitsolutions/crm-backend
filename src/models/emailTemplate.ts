import { Schema, model, Types } from "mongoose";

export interface EmailTemplate {
    accountId: Types.ObjectId;
    name: string;
    subject: string;
    preheader?: string;

    // Content
    html: string;
    text?: string;
    design?: any; // editor JSON (MJML / Unlayer / custom builder)

    // Metadata
    category?: string; // marketing, transactional, follow-up
    tags?: string[];

    // AI support
    generatedBy?: "ai" | "user";
    aiPrompt?: string;

    // Versioning & status
    status: "draft" | "active" | "archived";
    version: number;

    createdBy?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}
const EmailTemplateSchema = new Schema<EmailTemplate>(
    {
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        subject: {
            type: String,
            required: true,
            trim: true,
        },

        preheader: {
            type: String,
            trim: true,
        },

        html: {
            type: String,
            required: true,
        },

        text: {
            type: String,
        },

        design: {
            type: Schema.Types.Mixed, // Email builder JSON
        },

        category: {
            type: String,
            enum: ["marketing", "transactional", "follow-up", "newsletter"],
            default: "marketing",
        },

        tags: [{ type: String }],

        generatedBy: {
            type: String,
            enum: ["ai", "user"],
            default: "user",
        },

        aiPrompt: {
            type: String,
        },

        status: {
            type: String,
            enum: ["draft", "active", "archived"],
            default: "draft",
            index: true,
        },

        version: {
            type: Number,
            default: 1,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { 
        timestamps: true,
        versionKey: false,
        toJSON: {
            transform(_, ret) {
                delete (ret as any).__v;
                return ret;
            },
        },
    }
);

EmailTemplateSchema.index(
    { accountId: 1, name: 1 },
    { unique: true }
);


export const EmailTemplateModel = model<EmailTemplate>("EmailTemplate", EmailTemplateSchema);