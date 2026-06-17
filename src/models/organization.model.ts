import { model, Schema } from "mongoose";

const organizationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    logo: {
      type: String,
    },

    website: {
      type: String,
    },

    industry: {
      type: String,
    },

    size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
    },

    phone: {
      type: String,
    },

    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },

    billingEmail: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    terms: {
      type: String,
    },

    privacyPolicy: {
      type: String,
    },

    settings: {
      allowInvites: {
        type: Boolean,
        default: true,
      },
      requireEmailVerification: {
        type: Boolean,
        default: false,
      },
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
  },
);

export const Organization = model("Organization", organizationSchema);
