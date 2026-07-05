import mongoose, { Schema, Document } from "mongoose";

export interface IWebhookToken extends Document {
    organizationId: mongoose.Types.ObjectId;
    accountId: mongoose.Types.ObjectId;

    name: string;
    description?: string;

    tokenHash: string;
    tokenPrefix: string;

    permissions: string[];

    isActive: boolean;

    createdBy: mongoose.Types.ObjectId;

    lastUsedAt?: Date;
    regeneratedAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const webhookTokenSchema = new Schema<IWebhookToken>(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true,
        },

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

        description: {
            type: String,
            default: "",
        },

        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        // Used only for displaying token info
        // Example: webhook_abcd****
        tokenPrefix: {
            type: String,
            required: true,
        },

        permissions: {
            type: [String],
            default: ["lead:create"],
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        lastUsedAt: Date,

        regeneratedAt: Date,
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: {
            transform(_, ret: any) {
                ret.id = ret._id;
                delete ret._id;
                return ret;
            },
        },
    }
);
webhookTokenSchema.index(
    {accountId:1}
)

export const WebhookTokenModel = mongoose.model<IWebhookToken>(
    "WebhookToken",
    webhookTokenSchema
);