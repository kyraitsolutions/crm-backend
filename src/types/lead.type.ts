export type LeadSourceName =
  | "website"
  | "google_ads"
  | "facebook"
  | "instagram"
  | "webform"
  | "whatsapp"
  | "manual"
  | "webhook"
  | "import"
export interface ILead {
  accountId?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  message?: string;
  description?: string;
  company?: string;
  title?: string;
  website?: string;

  customFields?: Record<string, any>;

  stage?: "intake" | "qualified" | "converted";
  status?: "active" | "inactive" | "pending";

  source?: {
    name?: LeadSourceName;
    url?: string;
    formId?: string;
    chatbotId?: string;
  };

  assignedTo?: string;
  tags?: string[];
  notes?: any[];
  attachments?: string[];

  meta?: {
    ip?: string;
    userAgent?: string;
    location?: {
      address?: string;
      country?: string;
      city?: string;
      coordinates?: {
        lat?: number | null;
        lng?: number | null;
      };
    };
  };

  createdAt?: Date | string;
  updatedAt?: Date | string;
}