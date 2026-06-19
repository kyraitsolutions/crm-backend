import mongoose, { Schema, Document, model, Model } from "mongoose";
import { RecycleBinType } from "../enums/recyclebin.enum.js";

export interface IRecycleBinItem extends Document {
  originalId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  moduleName: RecycleBinType; // "leads" | "contacts" | "chatbots" | "webforms"
  data: Record<string, unknown>; // full document snapshot
  deletedBy: mongoose.Types.ObjectId;
  deletedAt: Date;
  expiresAt: Date; // TTL index — auto-purge after N days
}

const recycleBinSchema = new Schema<IRecycleBinItem>(
  {
    originalId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    moduleName: {
      type: String,
      required: true,
      enum: Object.values(RecycleBinType),
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      index: {
        expires: 0,
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

recycleBinSchema.index({ collectionName: 1, deletedAt: -1 });

export const RecyclebinModel: Model<IRecycleBinItem> = model(
  "Recyclebin",
  recycleBinSchema,
);
