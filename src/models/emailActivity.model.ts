import mongoose, { Document, Schema, Types } from "mongoose";

export enum EmailStatus {
    QUEUED = "queued",
    SENT = "sent",
    FAILED = "failed",
    DELIVERED = "delivered",
    OPENED = "opened",
    BOUNCED = "bounced",
}

export enum EmailType {
    FOLLOW_UP = "follow_up",
    CAMPAIGN = "campaign",
    MANUAL = "manual",
    AUTOMATED = "automated",
}

export interface IEmailActivity extends Document {
    accountId: Types.ObjectId;

    leadId?: Types.ObjectId;
    contactId?: Types.ObjectId;
    name:string;

    to: string;
    fromEmail: string;

    subject: string;
    html: string;

    status: EmailStatus;
    type: EmailType;

    messageId?: string;
    error?: string;

    sentAt?: Date;
    openedAt?: Date;

    createdBy?: Types.ObjectId;
}

const emailActivitySchema = new Schema<IEmailActivity>(
    {
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,
        },

        leadId: {
            type: Schema.Types.ObjectId,
            ref: "Lead",
            default: null,
            index: true,
        },

        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            default: null,
            index: true,
        },

        name: {
            type: String,
            required: true,
            lowercase: true,
        },
        to: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        fromEmail: {
            type: String,
            required: true,
        },

        subject: {
            type: String,
            required: true,
        },

        html: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: Object.values(EmailStatus),
            default: EmailStatus.QUEUED,
            index: true,
        },

        type: {
            type: String,
            enum: Object.values(EmailType),
            default: EmailType.MANUAL,
        },

        messageId: {
            type: String,
            default: null,
        },

        error: {
            type: String,
            default: null,
        },

        sentAt: {
            type: Date,
            default: null,
        },

        openedAt: {
            type: Date,
            default: null,
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Better query performance
emailActivitySchema.index({ leadId: 1, createdAt: -1 });
emailActivitySchema.index({ contactId: 1, createdAt: -1 });
emailActivitySchema.index({ accountId: 1 });

export const EmailActivity = mongoose.model<IEmailActivity>(
    "EmailActivity",
    emailActivitySchema
);