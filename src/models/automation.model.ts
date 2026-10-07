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
        "CONTACT_CREATED",
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

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        const row = ret as { id?: unknown; _id?: unknown; __v?: unknown };
        row.id = row._id;
        delete row._id;
        delete row.__v;
        return row;
      },
    },
  },
);

export const AutomationModel = mongoose.model("Automation", automationSchema);
