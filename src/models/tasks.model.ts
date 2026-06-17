import { Schema, model } from "mongoose";
const taskSchema = new Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      set(value: string) {
        return value?.trim().toLowerCase();
      },
    },

    dueDate: Date,

    completedAt: Date,

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // What record is this task related to?
    entityType: {
      type: String,
      enum: ["lead", "contact", "deal", "campaign", "conversation"],
      required: true,
      index: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    source: {
      type: {
        type: String,
        enum: ["manual", "automation", "system"],
        default: "manual",
      },

      automationId: {
        type: Schema.Types.ObjectId,
        ref: "Automation",
      },
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Task = model("Task", taskSchema);
