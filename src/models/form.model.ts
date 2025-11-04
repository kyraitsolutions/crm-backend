import mongoose, { model } from "mongoose";

const formSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: true,
        index: true,
    },
    formTitle: { type: String, required: true },
    formDescription: { type: String },
    headerImage: { type: String },
    formName: { type: String, required: true, unique: true, index: true },
    formFields: {
        name: { type: Boolean, default: true },
        phoneNumber: { type: Boolean, default: true },
        email: { type: Boolean, default: false },
        message: { type: Boolean, default: false },
        customFields: 
            [
                {
                    label: String,
                    key: String,
                    required: Boolean,
                },
            ],
    },
    successMessage: { type: String },
    successCTA: {
    type: String,
    enum: ["phone", "whatsapp", "sms", "email", "open_website"],
    },
    successCTADestination: { type: String }, // e.g. URL, phone number, etc.
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

// Indexes for better performance
formSchema.index({ accountId: 1 });
formSchema.index({ formName: 1 });
formSchema.index({ createdAt: -1 });

export const FormModel= model("Form", formSchema);
