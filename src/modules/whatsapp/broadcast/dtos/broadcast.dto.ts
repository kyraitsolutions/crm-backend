import { HttpError } from "../../../../utils/http.error.js";

export class CreateWhatsAppCampaignDto {
  name?: string;
  templateId: string;
  audience: {
    mode?: "contacts" | "filters" | "all";
    contactIds?: string[];
    filters?: Record<string, unknown>;
  };
  excludeOptedOut?: boolean;
  timezone?: string;
  scheduledAt?: string;

  constructor(data: Record<string, any>) {
    if (!data?.templateId) {
      throw HttpError.badRequest("Select an approved marketing template");
    }
    this.templateId = String(data.templateId);
    this.name = data.name;
    this.audience = data.audience || { mode: "contacts", contactIds: [] };
    this.excludeOptedOut = data.excludeOptedOut !== false;
    this.timezone = data.timezone;
    this.scheduledAt = data.scheduledAt;
  }
}

export class UpdateWhatsAppOptInDto {
  skipOptedOutCampaigns?: boolean;
  optOut?: { keywords?: string[]; autoReply?: boolean; message?: string };
  optIn?: { keywords?: string[]; autoReply?: boolean; message?: string };

  constructor(data: Record<string, any>) {
    this.skipOptedOutCampaigns = data.skipOptedOutCampaigns;
    this.optOut = data.optOut;
    this.optIn = data.optIn;
  }
}

export class TestWhatsAppCampaignDto {
  templateId?: string;
  campaignId?: string;
  phone: string;
  name?: string;
  countryCode?: string;

  constructor(data: Record<string, any>) {
    const phone = String(data.phone || data.to || "").trim();
    if (!phone) throw HttpError.badRequest("WhatsApp number is required");
    if (!data.templateId && !data.campaignId) {
      throw HttpError.badRequest("Template or campaign is required for a test send");
    }
    this.phone = phone;
    this.templateId = data.templateId;
    this.campaignId = data.campaignId;
    this.name = data.name;
    this.countryCode = data.countryCode;
  }
}
