import { HttpError } from "../../../utils/http.error.js";
import type { TRuntimeMessage } from "../runtime/types/runtime.type.js";

const asString = (value: unknown, fallback = "") =>
  value == null ? fallback : String(value);

export class InvokeAiAgentRuntimeDto {
  message: string;
  useDraft: boolean;
  threadId: string;
  allowWrites: boolean;
  contactId: string;
  leadId: string;
  phone: string;
  contactName: string;
  history: TRuntimeMessage[];
  selectionId: string;

  constructor(data: Record<string, unknown>) {
    this.message = asString(data.message ?? data.userMessage).trim();
    if (!this.message) throw HttpError.badRequest("Message is required");
    this.useDraft = Boolean(data.useDraft);
    this.threadId = asString(data.threadId).trim();
    this.allowWrites = Boolean(data.allowWrites);
    this.contactId = asString(data.contactId).trim();
    this.leadId = asString(data.leadId).trim();
    this.phone = asString(data.phone).trim();
    this.contactName = asString(data.contactName).trim();
    this.selectionId = asString(data.selectionId).trim();
    this.history = Array.isArray(data.history)
      ? data.history
          .map((item) => {
            const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
            const role = asString(row.role);
            const content = asString(row.content).trim();
            if ((role !== "user" && role !== "assistant") || !content) return null;
            return { role, content } as TRuntimeMessage;
          })
          .filter((item): item is TRuntimeMessage => Boolean(item))
      : [];
  }
}
