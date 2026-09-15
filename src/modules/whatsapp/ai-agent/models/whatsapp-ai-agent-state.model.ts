import { Document, Schema, Types, model } from "mongoose";

export interface WhatsAppAiAgentState extends Document {
  organizationId: Types.ObjectId;
  accountId: Types.ObjectId;
  conversationId: Types.ObjectId;
  contactId?: Types.ObjectId | null;
  leadId?: Types.ObjectId | null;
  phone: string;
  currentIntent: string;
  buyingStage: string;
  requirements: Record<string, unknown>;
  missingFields: string[];
  leadScore: number;
  leadScoreLevel: string;
  lastAction: string;
  pendingAction: string;
  escalation: {
    required: boolean;
    reason: string;
    at: Date | null;
  };
  notifiedEvents: string[];
  lastInboundMessageId: string;
  lastOutboundAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
}

const schema = new Schema<WhatsAppAiAgentState>(
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
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
      index: true,
    },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact", default: null },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    phone: { type: String, default: "", index: true },
    currentIntent: { type: String, default: "" },
    buyingStage: { type: String, default: "" },
    requirements: { type: Schema.Types.Mixed, default: {} },
    missingFields: { type: [String], default: [] },
    leadScore: { type: Number, default: 0 },
    leadScoreLevel: { type: String, default: "LOW" },
    lastAction: { type: String, default: "" },
    pendingAction: { type: String, default: "" },
    escalation: {
      required: { type: Boolean, default: false },
      reason: { type: String, default: "" },
      at: { type: Date, default: null },
    },
    notifiedEvents: { type: [String], default: [] },
    lastInboundMessageId: { type: String, default: "" },
    lastOutboundAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

schema.index({ accountId: 1, phone: 1 });

export const WhatsAppAiAgentStateModel = model<WhatsAppAiAgentState>(
  "WhatsAppAiAgentState",
  schema,
);
