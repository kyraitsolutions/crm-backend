import { ILead, LeadSourceName } from "../types/lead.type.js";

export class LeadDto {
  accountId?: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  message: string;
  description: string;
  company: string;
  title: string;
  website: string;

  customFields: Record<string, any>;

  stage: string;
  status: "active" | "inactive" | "pending";

  source: {
    name: LeadSourceName;
    url: string;
    formId: string;
    chatbotId?: string;
    pageId?: string;
    leadgenId?: string;
    adId?: string;
    adgroupId?: string;
    campaignId?: string;
    createdTime?: Date | string | null;
  };

  assignedTo?: string;

  tags: string[];
  notes: any[];
  attachments: string[];

  meta: {
    ip: string;
    userAgent: string;
    location: {
      address: string;
      country: string;
      city: string;
      coordinates: {
        lat: number | null;
        lng: number | null;
      };
    };
  };

  constructor(data?: Partial<ILead>) {
    this.accountId = data?.accountId;
    this.name =
      data?.name ||
      (data as any)?.full_name ||
      (data as any)?.fullName ||
      "";
    this.email =
      data?.email ||
      (data as any)?.email_address ||
      (data as any)?.emailAddress ||
      "";
    this.phone =
      data?.phone ||
      (data as any)?.phoneNumber ||
      (data as any)?.phone_number ||
      (data as any)?.mobileNumber ||
      "";
    this.mobile =
      data?.mobile ||
      (data as any)?.mobileNumber ||
      (data as any)?.mobile_number ||
      this.phone;
    this.message = data?.message || "";
    this.description = data?.description || "";
    this.company = data?.company || "";
    this.title = data?.title || "";
    this.website = data?.website || "";

    this.customFields = data?.customFields || {};

    this.stage = data?.stage || "new";
    this.status = data?.status || "active";

    const sourceName =
      typeof data?.source === "string"
        ? data.source
        : data?.source?.name;

    this.source = {
      name: (sourceName || "manual") as LeadSourceName,
      url: data?.source?.url || "",
      formId: data?.source?.formId || "",
      chatbotId: data?.source?.chatbotId || "",
      pageId: data?.source?.pageId || "",
      leadgenId: data?.source?.leadgenId || "",
      adId: data?.source?.adId || "",
      adgroupId: data?.source?.adgroupId || "",
      campaignId: data?.source?.campaignId || "",
      createdTime: data?.source?.createdTime || null,
    };

    if (data?.assignedTo) {
      this.assignedTo = String(data.assignedTo);
    }

    this.tags = data?.tags || [];
    this.notes = data?.notes || [];
    this.attachments = data?.attachments || [];

    this.meta = {
      ip: data?.meta?.ip || "",
      userAgent: data?.meta?.userAgent || "",
      location: {
        address: data?.meta?.location?.address || "",
        country: data?.meta?.location?.country || "",
        city: data?.meta?.location?.city || "",
        coordinates: {
          lat: data?.meta?.location?.coordinates?.lat ?? null,
          lng: data?.meta?.location?.coordinates?.lng ?? null,
        },
      },
    };
  }
}
