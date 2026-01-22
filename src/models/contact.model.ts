import { Schema, model, Types } from "mongoose";

export interface Contact {
    accountId: Types.ObjectId;

    // Identity
    email: string;
    name?: string;
    phone?: string;
    company?: string;

    // Lifecycle
    lifecycleStage: "lead" | "subscriber" | "customer" | "inactive";

    // Consent & compliance
    consent: {
        marketing: boolean;
        source?: "chatbot" | "webform" | "manual" | "import";
        timestamp?: Date;
    };

    // Metadata
    source: {
        firstTouch?: "chatbot" | "website" | "google_ads" | "manual" | "import";
        lastTouch?: string;
    };

    // Segmentation
    tags: string[];

    // Ownership
    assignedTo?: Types.ObjectId;

    // System
    createdAt: Date;
    updatedAt: Date;
}

const contactSchema = new Schema<Contact>(
    {
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        company: { type: String, trim: true },

        lifecycleStage: {
            type: String,
            enum: ["lead", "subscriber", "customer", "inactive"],
            default: "lead",
        },

        consent: {
            marketing: { type: Boolean, default: false },
            source: {
                type: String,
                enum: ["chatbot", "webform", "manual", "import"],
            },
            timestamp: Date,
        },

        source: {
            firstTouch: {
                type: String,
                enum: ["chatbot", "website", "google_ads", "manual", "import"],
            },
            lastTouch: { type: String },
        },

        tags: [{ type: String }],

        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
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


contactSchema.index(
    { accountId: 1, email: 1 },
    {
        unique: true,
        collation: { locale: "en", strength: 2 },
    }
);


export const ContactModel = model<Contact>("Contact", contactSchema);