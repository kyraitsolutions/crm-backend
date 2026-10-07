import { Document, Schema, Types, model } from "mongoose";
import {
  CHATFLOW_SESSION_STATUS,
  type TChatFlowSessionStatus,
} from "../constants/chatflow-session.constant.js";

export interface WhatsAppChatFlowSession extends Document {
  organizationId?: Types.ObjectId;
  accountId: Types.ObjectId;
  conversationId: Types.ObjectId;
  chatFlowId: Types.ObjectId;
  phone: string;
  status: TChatFlowSessionStatus;
  currentNodeId: string | null;
  waitingForReply: boolean;
  startedAt: Date;
  startedByMessageId: string | null;
  lastInboundMessageId: string | null;
  lastReplyAt: Date | null;
  pausedAt: Date | null;
  pauseReason: string | null;
  completedAt: Date | null;
  completedReason: string | null;
  variables: Record<string, string>;
  jumpCount: number;
  delayToken: string;
  resumeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<WhatsAppChatFlowSession>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
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
    chatFlowId: {
      type: Schema.Types.ObjectId,
      ref: "ChatFlow",
      required: true,
      index: true,
    },
    phone: { type: String, default: "", index: true },
    status: {
      type: String,
      enum: Object.values(CHATFLOW_SESSION_STATUS),
      default: CHATFLOW_SESSION_STATUS.WAITING,
      index: true,
    },
    currentNodeId: { type: String, default: null },
    waitingForReply: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    startedByMessageId: { type: String, default: null },
    lastInboundMessageId: { type: String, default: null },
    lastReplyAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    pauseReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
    completedReason: { type: String, default: null },
    variables: { type: Schema.Types.Mixed, default: {} },
    jumpCount: { type: Number, default: 0 },
    delayToken: { type: String, default: "" },
    resumeAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

schema.index({ accountId: 1, status: 1 });

export const WhatsAppChatFlowSessionModel = model<WhatsAppChatFlowSession>(
  "WhatsAppChatFlowSession",
  schema,
);
