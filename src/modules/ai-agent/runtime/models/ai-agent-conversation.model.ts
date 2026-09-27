import { Document, Schema, Types, model } from "mongoose";
import { AI_AGENT_CHANNEL } from "../constants/runtime.constant.js";
import type { TAiAgentChannel } from "../types/runtime.type.js";

export interface AiAgentConversation extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  agentVersionId: Types.ObjectId | null;
  channel: TAiAgentChannel;
  threadId: string;
  status: "active" | "closed";
  summary: string;
  catalog: {
    sourceKey: string;
    items: { id: string; title: string }[];
    selectedId: string;
    choices: { id: string; title: string; field: string; kind: "image" | "text" }[];
    selected: {
      id: string;
      title: string;
      price: string;
      description: string;
      image: string;
      rating: string;
    } | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiAgentConversation>(
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
    agentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "AiAgentVersion",
      default: null,
    },
    channel: {
      type: String,
      enum: Object.values(AI_AGENT_CHANNEL),
      default: AI_AGENT_CHANNEL.TEST,
      index: true,
    },
    threadId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    summary: { type: String, default: "" },
    catalog: {
      sourceKey: { type: String, default: "" },
      items: {
        type: [
          {
            id: { type: String },
            title: { type: String },
          },
        ],
        default: [],
      },
      selectedId: { type: String, default: "" },
      selected: { type: Schema.Types.Mixed, default: null },
      choices: {
        type: [
          {
            id: { type: String },
            title: { type: String },
            field: { type: String },
            kind: { type: String },
          },
        ],
        default: [],
      },
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

schema.index({ accountId: 1, channel: 1, updatedAt: -1 });

export const AiAgentConversationModel = model<AiAgentConversation>(
  "AiAgentConversation",
  schema,
);
