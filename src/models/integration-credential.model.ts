import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
      unique: true,
    },

    accessToken: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    tokenExpiresAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const IntegrationCredentialModel = model(
  "IntegrationCredential",
  schema,
);
