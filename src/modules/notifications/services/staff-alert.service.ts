import { Types } from "mongoose";
import { UserAccount } from "../../../models/user.accounts.model.js";
import { UserProfileModel } from "../../../models/userProfile.model.js";
import { UserModel } from "../../../models/user.model.js";
import { HttpError } from "../../../utils/http.error.js";
import logger from "../../../utils/logger.js";
import { normalizeNotificationSource } from "../utils/source.util.js";
import { StaffAlertConfigModel } from "../models/staff-alert-config.model.js";
import { notificationDispatchService } from "./notification-dispatch.service.js";
import { WhatsappTemplateModel } from "../../whatsapp/templates/models/template.model.js";
import {
  buildTemplateComponents,
  toWhatsAppRecipient,
} from "../../whatsapp/broadcast/utils/broadcast.util.js";

export type StaffAlertChannels = {
  in_app: boolean;
  email: boolean;
  whatsapp: boolean;
};

export type StaffAlertConfigDto = {
  organizationId: string;
  accountId: string;
  enabled: boolean;
  channels: StaffAlertChannels;
  recipientUserIds: string[];
  events: { lead_created: boolean };
  whatsapp: {
    defaultTemplateId: string | null;
    bySource: Array<{ source: string; templateId: string }>;
  };
};

function defaultConfig(
  organizationId: string,
  accountId: string,
): StaffAlertConfigDto {
  return {
    organizationId,
    accountId,
    enabled: true,
    channels: { in_app: true, email: true, whatsapp: false },
    recipientUserIds: [],
    events: { lead_created: true },
    whatsapp: { defaultTemplateId: null, bySource: [] },
  };
}

function toDto(row: any): StaffAlertConfigDto {
  return {
    organizationId: String(row.organizationId),
    accountId: String(row.accountId),
    enabled: row.enabled !== false,
    channels: {
      in_app: row.channels?.in_app !== false,
      email: row.channels?.email !== false,
      whatsapp: Boolean(row.channels?.whatsapp),
    },
    recipientUserIds: (row.recipientUserIds || []).map((id: unknown) =>
      String(id),
    ),
    events: {
      lead_created: row.events?.lead_created !== false,
    },
    whatsapp: {
      defaultTemplateId: row.whatsapp?.defaultTemplateId
        ? String(row.whatsapp.defaultTemplateId)
        : null,
      bySource: (row.whatsapp?.bySource || []).map((item: any) => ({
        source: String(item.source),
        templateId: String(item.templateId),
      })),
    },
  };
}

export class StaffAlertService {
  async getConfig(
    organizationId: string,
    accountId: string,
  ): Promise<StaffAlertConfigDto> {
    const row = await StaffAlertConfigModel.findOne({
      organizationId,
      accountId,
    }).lean();
    return row ? toDto(row) : defaultConfig(organizationId, accountId);
  }

  async upsertConfig(
    organizationId: string,
    accountId: string,
    patch: Partial<StaffAlertConfigDto>,
  ): Promise<StaffAlertConfigDto> {
    if (!accountId) throw HttpError.badRequest("accountId is required");

    const current = await this.getConfig(organizationId, accountId);
    const next: StaffAlertConfigDto = {
      ...current,
      ...patch,
      organizationId,
      accountId,
      channels: { ...current.channels, ...(patch.channels || {}) },
      events: { ...current.events, ...(patch.events || {}) },
      whatsapp: {
        defaultTemplateId:
          patch.whatsapp?.defaultTemplateId !== undefined
            ? patch.whatsapp.defaultTemplateId
            : current.whatsapp.defaultTemplateId,
        bySource:
          patch.whatsapp?.bySource !== undefined
            ? patch.whatsapp.bySource
            : current.whatsapp.bySource,
      },
      recipientUserIds:
        patch.recipientUserIds !== undefined
          ? patch.recipientUserIds
          : current.recipientUserIds,
      enabled:
        typeof patch.enabled === "boolean" ? patch.enabled : current.enabled,
    };

    if (next.channels.whatsapp && !next.whatsapp.defaultTemplateId) {
      // Allow save without default if every source mapping exists; still warn via UI.
    }

    const updated = await StaffAlertConfigModel.findOneAndUpdate(
      { organizationId, accountId },
      {
        $set: {
          enabled: next.enabled,
          channels: next.channels,
          recipientUserIds: next.recipientUserIds.filter((id) =>
            Types.ObjectId.isValid(id),
          ),
          events: next.events,
          whatsapp: {
            defaultTemplateId: next.whatsapp.defaultTemplateId,
            bySource: next.whatsapp.bySource.map((row) => ({
              source: normalizeNotificationSource(row.source) || row.source,
              templateId: row.templateId,
            })),
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return toDto(updated);
  }

  private async resolveRecipientIds(
    organizationId: string,
    accountId: string,
    configured: string[],
  ): Promise<string[]> {
    if (configured.length) {
      return [...new Set(configured.map(String))];
    }
    const rows = await UserAccount.find({ accountId }).select("userId").lean();
    const ids = rows.map((r) => String(r.userId));
    if (ids.length) return ids;

    // Fallback: org members
    const { OrganizationMember } = await import(
      "../../../models/organizationMember.model.js"
    );
    const members = await OrganizationMember.find({ organizationId })
      .select("userId")
      .lean();
    return members.map((m) => String(m.userId));
  }

  private pickTemplateId(
    config: StaffAlertConfigDto,
    source: string | null,
  ): string | null {
    if (source && config.whatsapp.bySource.length) {
      const normalized = normalizeNotificationSource(source) || source;
      const hit = config.whatsapp.bySource.find(
        (row) =>
          row.source === normalized ||
          row.source.toLowerCase() === String(source).toLowerCase(),
      );
      if (hit?.templateId) return hit.templateId;
    }
    return config.whatsapp.defaultTemplateId;
  }

  /**
   * Org-level lead alert: Bell + Email + WhatsApp template to configured staff.
   */
  async notifyLeadCreated(input: {
    organizationId: string;
    accountId: string;
    leadId: string;
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
    assigneeId?: string | null;
    leadScore?: number | null;
  }) {
    const config = await this.getConfig(
      input.organizationId,
      input.accountId,
    );

    if (!config.enabled || !config.events.lead_created) {
      return null;
    }

    const recipientUserIds = await this.resolveRecipientIds(
      input.organizationId,
      input.accountId,
      config.recipientUserIds,
    );

    if (!recipientUserIds.length) {
      logger.warn("Staff alert skipped: no recipients", {
        accountId: input.accountId,
      });
      return null;
    }

    const who = input.name || input.phone || input.email || "a new contact";
    const details = [input.phone, input.email].filter(Boolean).join(" · ");
    const title = `New lead: ${who}`;
    const body = details || "A new lead was created";

    const channels: Array<"in_app" | "email"> = [];
    if (config.channels.in_app) channels.push("in_app");
    if (config.channels.email) channels.push("email");

    let inbox: Record<string, unknown> | null = null;
    if (channels.length) {
      inbox = await notificationDispatchService.dispatch({
        eventKey: "lead.created",
        organizationId: input.organizationId,
        accountId: input.accountId,
        source: input.source,
        entityType: "lead",
        entityId: input.leadId,
        typeId: input.leadId,
        assigneeId: input.assigneeId,
        leadScore: input.leadScore,
        title,
        body,
        deepLink: `/dashboard`,
        recipientUserIds,
        channels,
        payload: {
          leadId: input.leadId,
          source: input.source,
          kind: "staff_alert",
        },
      });
    }

    if (config.channels.whatsapp) {
      await this.sendWhatsAppStaffAlerts({
        accountId: input.accountId,
        config,
        recipientUserIds,
        source: input.source || null,
        lead: {
          name: input.name,
          phone: input.phone,
          email: input.email,
        },
      });
    }

    return inbox;
  }

  private async sendWhatsAppStaffAlerts(input: {
    accountId: string;
    config: StaffAlertConfigDto;
    recipientUserIds: string[];
    source: string | null;
    lead: { name?: string; phone?: string; email?: string };
  }) {
    const templateId = this.pickTemplateId(input.config, input.source);
    if (!templateId) {
      logger.warn("Staff WhatsApp alert skipped: no template configured", {
        accountId: input.accountId,
        source: input.source,
      });
      return;
    }

    const template = await WhatsappTemplateModel.findOne({
      _id: templateId,
      accountId: input.accountId,
      status: "APPROVED",
    }).lean();

    if (!template) {
      logger.warn("Staff WhatsApp alert skipped: template not approved", {
        accountId: input.accountId,
        templateId,
      });
      return;
    }

    const profiles = await UserProfileModel.find({
      userId: { $in: input.recipientUserIds },
    })
      .select("userId phone firstName")
      .lean();

    const users = await UserModel.find({
      _id: { $in: input.recipientUserIds },
    })
      .select("_id email")
      .lean();

    const phoneByUser = new Map<string, string>();
    for (const profile of profiles) {
      const phone = toWhatsAppRecipient(String(profile.phone || ""));
      if (phone) phoneByUser.set(String(profile.userId), phone);
    }

    // Fallback: nothing if no phone on profile
    const contactForVars = {
      name: input.lead.name || "Lead",
      phone: input.lead.phone || "",
    };
    const components = buildTemplateComponents(template, contactForVars);

    // Lazy import avoids circular init with WhatsappMessageService ↔ conversations/notifications.
    const { WhatsappMessageService } = await import(
      "../../whatsapp/messages/services/message.service.js"
    );
    const whatsappMessageService = new WhatsappMessageService();

    for (const userId of input.recipientUserIds) {
      const to = phoneByUser.get(userId);
      if (!to) {
        logger.warn("Staff WhatsApp alert skipped: user has no phone", {
          userId,
          accountId: input.accountId,
        });
        continue;
      }

      try {
        await whatsappMessageService.send(input.accountId, {
          type: "template",
          to,
          source: "automation",
          from: "bot",
          template: {
            name: template.name,
            language: { code: template.language || "en" },
            ...(components ? { components } : {}),
          },
        });
      } catch (error) {
        logger.warn("Staff WhatsApp alert send failed", {
          userId,
          to,
          accountId: input.accountId,
          error: error instanceof Error ? error.message : String(error),
          email: users.find((u) => String(u._id) === userId)?.email,
        });
      }
    }
  }
}

export const staffAlertService = new StaffAlertService();
