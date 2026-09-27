import { Document, Schema, Types, model } from "mongoose";
import { AI_AGENT_STATUS } from "../constants/ai-agent.constant.js";
import type { TAiAgentStatus } from "../types/ai-agent.type.js";

export interface AiAgent extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  name: string;
  status: TAiAgentStatus;
  activeVersionId: Types.ObjectId | null;
  draftVersionId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiAgent>(
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
      unique: true,
      index: true,
    },
    name: { type: String, default: "Kyra AI Agent", trim: true },
    status: {
      type: String,
      enum: Object.values(AI_AGENT_STATUS),
      default: AI_AGENT_STATUS.DRAFT,
      index: true,
    },
    activeVersionId: {
      type: Schema.Types.ObjectId,
      ref: "AiAgentVersion",
      default: null,
    },
    draftVersionId: {
      type: Schema.Types.ObjectId,
      ref: "AiAgentVersion",
      default: null,
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

export const AiAgentModel = model<AiAgent>("AiAgent", schema);
