import { Document, Schema, model, Types } from "mongoose";

export interface UsagePeriodDocument extends Document {
  organizationId: Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  metrics: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const usagePeriodSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    metrics: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true, versionKey: false },
);

usagePeriodSchema.index(
  { organizationId: 1, periodStart: 1, periodEnd: 1 },
  { unique: true },
);

export const UsagePeriod = model<UsagePeriodDocument>(
  "UsagePeriod",
  usagePeriodSchema,
);
