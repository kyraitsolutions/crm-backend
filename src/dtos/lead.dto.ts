import { ILead, LeadSourceName } from "../types/lead.type";

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
        chatbotId: string;
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
        this.name = data?.name || "";
        this.email = data?.email || "";
        this.phone = data?.phone || "";
        this.mobile = data?.mobile || "";
        this.message = data?.message || "";
        this.description = data?.description || "";
        this.company = data?.company || "";
        this.title = data?.title || "";
        this.website = data?.website || "";

        this.customFields = data?.customFields || {};

        this.stage = data?.stage||"new";
        this.status = data?.status || "active";

        this.source = {
            name: (data?.source?.name || "manual") as LeadSourceName,
            url: data?.source?.url || "",
            formId: data?.source?.formId || "",
            chatbotId: data?.source?.chatbotId || "",
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