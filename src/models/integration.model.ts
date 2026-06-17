import { Schema, model } from "mongoose";

export enum IntegrationProvider {
  WHATSAPP = "WHATSAPP",
  FACEBOOK = "FACEBOOK",
  INSTAGRAM = "INSTAGRAM",
  EXOTEL = "EXOTEL",
}

export enum IntegrationStatus {
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
}

const IntegrationSchema = new Schema(
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

    provider: {
      type: String,
      enum: Object.values(IntegrationProvider),
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(IntegrationStatus),
      default: IntegrationStatus.CONNECTED,
    },

    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

IntegrationSchema.index({
  accountId: 1,
  provider: 1,
});

export const IntegrationModel = model("Integration", IntegrationSchema);
