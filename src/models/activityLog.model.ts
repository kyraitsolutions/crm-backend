import { Schema, model } from "mongoose";

const changeSchema = new Schema(
  {
    from: Schema.Types.Mixed,
    to: Schema.Types.Mixed,
  },
  {
    _id: false,
    id: false,
  },
);

const activityLogSchema = new Schema(
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
      // required: true,
      index: true,
    },

    // What object was affected?
    entityType: {
      type: String,
      required: true,
      index: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Action performed
    action: {
      type: String,
      required: true,
      index: true,
    },

    // Who triggered it?
    actor: {
      type: {
        type: String,
        enum: ["user", "automation", "system", "api"],
        required: true,
      },

      id: {
        type: Schema.Types.ObjectId,
      },

      name: String,
    },

    // Audit details
    changes: {
      type: Map,
      of: changeSchema,
      default: {},
    },

    // Extra contextual information
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Request context
    source: {
      ip: String,
      userAgent: String,
      apiKeyId: Schema.Types.ObjectId,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

export const ActivityLog = model("ActivityLog", activityLogSchema);
