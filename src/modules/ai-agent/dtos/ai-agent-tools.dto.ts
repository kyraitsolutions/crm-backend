import { HttpError } from "../../../utils/http.error.js";

const asString = (value: unknown, fallback = "") =>
  value == null ? fallback : String(value);

const asObject = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
};

export class ExecuteAiAgentToolDto {
  key: string;
  args: Record<string, unknown>;
  useDraft: boolean;
  dryRun: boolean;
  contactId: string;
  leadId: string;
  phone: string;
  contactName: string;
  conversationId: string;

  constructor(data: Record<string, unknown>) {
    this.key = asString(data.key).trim();
    if (!this.key) throw HttpError.badRequest("Tool key is required");
    this.args = asObject(data.args);
    this.useDraft = Boolean(data.useDraft);
    this.dryRun = data.dryRun === false || data.allowWrites === true ? false : true;
    this.contactId = asString(data.contactId).trim();
    this.leadId = asString(data.leadId).trim();
    this.phone = asString(data.phone).trim();
    this.contactName = asString(data.contactName).trim();
    this.conversationId = asString(data.conversationId).trim();
  }
}
