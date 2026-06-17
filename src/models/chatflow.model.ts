import mongoose, { Schema, Types } from "mongoose";

const nodeDataSchema = new Schema(
  {
    label: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      required: true,
    },

    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
  },
);

const chatFlowNodeSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    position: {
      x: {
        type: Number,
        required: true,
      },

      y: {
        type: Number,
        required: true,
      },
    },

    width: Number,
    height: Number,

    selected: {
      type: Boolean,
      default: false,
    },

    dragging: {
      type: Boolean,
      default: false,
    },

    data: {
      type: nodeDataSchema,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const chatFlowEdgeSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      required: true,
    },

    target: {
      type: String,
      required: true,
    },

    sourceHandle: {
      type: String,
      default: null,
    },

    targetHandle: {
      type: String,
      default: null,
    },

    animated: {
      type: Boolean,
      default: false,
    },

    label: String,
  },
  {
    _id: false,
  },
);

const chatFlowSchema = new Schema(
  {
    accountId: {
      type: Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    organizationId: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },

    nodes: {
      type: [chatFlowNodeSchema],
      default: [],
    },

    edges: {
      type: [chatFlowEdgeSchema],
      default: [],
    },

    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    version: {
      type: Number,
      default: 1,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    lastEditedBy: {
      type: Types.ObjectId,
      ref: "User",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
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

export const ChatFlow = mongoose.model("ChatFlow", chatFlowSchema);
