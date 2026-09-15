import { Document, Schema, Types, model } from "mongoose";

export interface WhatsAppAiAgentKnowledge extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppAiAgentKnowledge>(
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
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
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

schema.index({ accountId: 1, status: 1, updatedAt: -1 });
schema.index(
  { title: "text", content: "text", tags: "text" },
  { name: "ai_agent_knowledge_text" },
);

export const WhatsAppAiAgentKnowledgeModel = model<WhatsAppAiAgentKnowledge>(
  "WhatsAppAiAgentKnowledge",
  schema,
);
