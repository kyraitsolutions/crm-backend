import { Document, model, Schema } from "mongoose";

export interface LeadNote {
    message: string;
    createdBy?: string; // Optional: User ID or name
    createdAt: Date;
}
export interface Lead extends Document {
    userId: Schema.Types.ObjectId | string;
    accountId: Schema.Types.ObjectId | string;
    name: string;
    email?: string;
    phone?: string;
    message?: string;
    customFields: Record<string, any>;

    stage: "Intake" | "Qualified" | "Converted";
    status: "Active" | "Inactive" | "Pending";

    source: {
        name: string; // e.g. Webform, Chatbot, Referral
        url?: string;
        formId?: string;
        chatbotId?: string;
    };

    assignedTo?: string;
    company?: string;
    tags?: string[];
    notes: LeadNote[];

    meta: {
        ip?: string;
        userAgent?: string;
        location?: {
            country?: string;
            city?: string;
            coordinates?: { lat: number; lng: number };
        };
    };

    createdAt: Date;
    updatedAt: Date;
}

const leadSchema = new Schema<Lead>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    message: { type: String },
    customFields: {
        type: Map,
        of: Schema.Types.Mixed,
        default: {},
    },

    stage: {
        type: String,
        enum: ["Intake", "Qualified", "Converted"],
        default: "Intake",
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Pending"],
        default: "Active",
    },

    source: {
        name: { type: String, required: true },
        url: { type: String },
        formId: { type: Schema.Types.ObjectId, ref: "WebForm" },
        chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot" },
    },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    company: { type: String },
    tags: [{ type: String }],

    notes: [
        {
            message: { type: String, required: true },
            createdBy: { type: Schema.Types.ObjectId, ref: "User" },
            createdAt: { type: Date, default: Date.now },
        },
    ],

    meta: {
        ip: String,
        userAgent: String,
        location: {
            country: String,
            city: String,
            coordinates: {
                lat: Number,
                lng: Number,
            },
        },
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_, ret: any) {
            delete (ret as any)._id;
            delete (ret as any).__v;
            return ret;
        }
    }
})

leadSchema.index({ accountId: 1 });
leadSchema.index({ userId: 1 });
leadSchema.index({ accountId: 1, stage: 1, status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ name: 1 });
leadSchema.index({ stage: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ "source.name": 1 });
leadSchema.index({ "source.formId": 1 });
leadSchema.index({ "source.chatbotId": 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ tags: 1 });
leadSchema.index({ company: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ updatedAt: -1 });
leadSchema.index({ name: "text", email: "text", phone: "text", company: "text" });

export const LeadModel = model<Lead>("Lead", leadSchema);
