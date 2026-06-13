import mongoose, { Schema } from "mongoose";

const actionSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
    },

    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  },
);

const automationSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    trigger: {
      type: String,
      enum: [
        "LEAD_CREATED",
        "LEAD_STAGE_CHANGED",
        "LEAD_STATUS_CHANGED",
        "LEAD_ASSIGNED",
        "CONVERSATION_CREATED",
        "CONVERSATION_CLOSED",
      ],
      set: (value: string) =>
        value
          ?.trim()
          .replace(/[-\s]+/g, "_") // - and space => _
          .toUpperCase(),
    },

    conditions: [
      {
        field: String,
        operator: String,
        values: Schema.Types.Mixed,
      },
    ],

    actions: {
      type: [actionSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
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

export const AutomationModel = mongoose.model("Automation", automationSchema);
