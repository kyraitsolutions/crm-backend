import { Document, Schema, Types, model } from "mongoose";
import { AI_AGENT_VERSION_STATUS } from "../constants/ai-agent.constant.js";
import type {
  TAiAgentConfig,
  TAiAgentVersionStatus,
} from "../types/ai-agent.type.js";

export interface AiAgentVersion extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  agentId: Types.ObjectId;
  version: number;
  status: TAiAgentVersionStatus;
  config: TAiAgentConfig;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AiAgentVersion>(
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
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "AiAgent",
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(AI_AGENT_VERSION_STATUS),
      default: AI_AGENT_VERSION_STATUS.DRAFT,
      index: true,
    },
    config: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
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

schema.index({ agentId: 1, version: 1 }, { unique: true });
schema.index({ accountId: 1, status: 1, updatedAt: -1 });

export const AiAgentVersionModel = model<AiAgentVersion>(
  "AiAgentVersion",
  schema,
);
