import { AUTOMATION_ACTIONS } from "../constants/automation.constant.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { LeadRespository } from "../repositories/lead.respository.js";
import { LeadModel } from "../models/lead.model.js";
import { TaskRepository } from "../repositories/task.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TActivityLog } from "../types/activityLog.type.js";
import { ActivityLogService } from "./activityLog.service.js";
import { EmailService } from "./email.service.js";
import logger from "../utils/logger.js";

/** UserRepository.findById aggregates profile under `userProfile` */
function userDisplayName(user: {
  email?: string;
  userProfile?: { firstName?: string | null; lastName?: string | null };
} | null): string {
  if (!user) return "";
  const name =
    `${user.userProfile?.firstName || ""} ${user.userProfile?.lastName || ""}`.trim();
  return name || user.email || "";
}

export default class ActionExecutor {
  private leadRepository = new LeadRespository();
  private taskRepository = new TaskRepository();
  private activityLogService = new ActivityLogService();
  private userRepository = new UserRepository();
  private emailService = new EmailService();
  private accountRepository = new AccountRepository();

  async execute(actions: any[], event: any) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case AUTOMATION_ACTIONS.ASSIGN_LEAD_TO_USER:
            await this.assignLead(event, action.config || {});
            break;
          case AUTOMATION_ACTIONS.CREATE_TASK:
            await this.createTask(event, action.config || {});
            break;
          case AUTOMATION_ACTIONS.SEND_NOTIFICATION:
            await this.sendNotification(event, action.config || {});
            break;
          case AUTOMATION_ACTIONS.UPDATE_LEAD_STAGE:
            await this.updateLeadStage(event, action.config || {});
            break;
          case AUTOMATION_ACTIONS.ADD_LEAD_TAG:
            await this.addLeadTag(event, action.config || {});
            break;
          default:
            logger.warn("Unknown automation action type", {
              type: action.type,
            });
        }
      } catch (error) {
        logger.error("Automation action failed", {
          type: action?.type,
          automationId: String(event?.automationId || ""),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private entityId(event: any): string {
    return String(event?.entityId || event?.id || event?._id || "");
  }

  private leadId(event: any): string {
    const type = String(event?.entityType || "lead").toLowerCase();
    if (type !== "lead") return "";
    return this.entityId(event);
  }

  private async assignLead(event: any, config: any) {
    const userId = String(config.user || config.assignedTo || "");
    const leadId = this.leadId(event);
    if (!userId || !leadId) return;

    const oldDoc = await LeadModel.findById(leadId).lean();
    const newDoc = await this.leadRepository.updateLeadById(leadId, {
      assignedTo: userId,
    });

    await this.activityLogService.logUpdate({
      oldDoc: { assignedTo: oldDoc?.assignedTo ?? null },
      newDoc: { assignedTo: userId },
      accountId: String(event.accountId),
      organizationId: String(event.organizationId),
      entityType: "lead",
      entityId: leadId,
      actor: {
        type: "automation",
        id: event?.automationId,
        name: event?.automationName,
      },
      metadata: {
        leadName: event?.name || newDoc?.name,
      },
    });

    const user = await this.userRepository.findById(userId);
    if (!user?.email) return;

    const frontend = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
    await this.emailService.queueLeadAssignedEmail({
      email: user.email,
      assigneeName: userDisplayName(
        user as {
          email?: string;
          userProfile?: { firstName?: string | null; lastName?: string | null };
        },
      ),
      leadName: newDoc?.name,
      leadEmail: newDoc?.email,
      leadPhone: newDoc?.phone,
      leadSource: newDoc?.source?.name,
      dashboardUrl: frontend
        ? `${frontend}/dashboard/account/${event.accountId}/leads/${leadId}`
        : "",
    });
  }

  private async updateLeadStage(event: any, config: any) {
    const leadId = this.leadId(event);
    const stage = String(config.stage || "").trim();
    if (!leadId || !stage) return;

    const oldDoc = await LeadModel.findById(leadId).lean();
    if (!oldDoc) return;
    if (String(oldDoc.stage || "") === stage) return;

    const newDoc = await this.leadRepository.updateLeadById(leadId, { stage });

    await this.activityLogService.logUpdate({
      oldDoc: { stage: oldDoc.stage ?? null },
      newDoc: { stage },
      accountId: String(event.accountId),
      organizationId: String(event.organizationId),
      entityType: "lead",
      entityId: leadId,
      actor: {
        type: "automation",
        id: event?.automationId,
        name: event?.automationName,
      },
      metadata: {
        leadName: event?.name || newDoc?.name,
      },
    });
  }

  private async addLeadTag(event: any, config: any) {
    const leadId = this.leadId(event);
    const tag = String(config.tag || "").trim();
    if (!leadId || !tag) return;

    const oldDoc = await LeadModel.findById(leadId).lean();
    if (!oldDoc) return;

    const existing = Array.isArray(oldDoc.tags)
      ? oldDoc.tags.map((t) => String(t))
      : [];
    if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) return;

    const tags = [...existing, tag];
    await this.leadRepository.updateLeadById(leadId, { tags });

    await this.activityLogService.logUpdate({
      oldDoc: { tags: existing },
      newDoc: { tags },
      accountId: String(event.accountId),
      organizationId: String(event.organizationId),
      entityType: "lead",
      entityId: leadId,
      actor: {
        type: "automation",
        id: event?.automationId,
        name: event?.automationName,
      },
      metadata: {
        leadName: event?.name || oldDoc.name,
      },
    });
  }

  private async createTask(event: any, config: any) {
    const entityId = this.entityId(event);
    if (!entityId) return;

    let dueDate = config.dueDate ? new Date(config.dueDate) : undefined;
    if (!dueDate && config.dueType && config.dueType !== "custom") {
      const days = Number(config.dueType);
      if (!Number.isNaN(days)) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
      }
    }

    const entityType = String(event.entityType || "lead").toLowerCase();

    const task = await this.taskRepository.create({
      title: config.title || "Follow up",
      description: config.description || "",
      priority: config.priority || "medium",
      dueDate,
      assignedTo: config.assignedTo || undefined,
      organizationId: event.organizationId,
      accountId: event.accountId,
      entityType,
      entityId,
      source: {
        type: "automation",
        automationId: event.automationId,
      },
    });

    await this.activityLogService.logCreate({
      accountId: String(event.accountId),
      organizationId: String(event.organizationId),
      entityType: "task",
      entityId: String(task?._id || task?.id || ""),
      actor: {
        type: "automation",
        id: event?.automationId,
        name: event?.automationName,
      },
      metadata: {
        title: config.title,
      },
    } as Partial<TActivityLog>);

    if (!config.assignedTo) return;
    const user = await this.userRepository.findById(config.assignedTo);
    if (!user?.email) return;

    const frontend = String(process.env.FRONTEND_URL || "").replace(/\/$/, "");
    await this.emailService.queueTaskAssignedEmail({
      email: user.email,
      assigneeName: userDisplayName(
        user as {
          email?: string;
          userProfile?: { firstName?: string | null; lastName?: string | null };
        },
      ),
      taskTitle: config?.title,
      taskDescription: config.description,
      priority: config.priority,
      dueDate: dueDate?.toISOString?.() || config.dueDate,
      leadName: event?.name || event?.contact?.name,
      dashboardUrl: frontend ? `${frontend}/dashboard` : "",
    });
  }

  private async sendNotification(event: any, config: any) {
    const leadId = this.leadId(event);
    const lead = leadId
      ? await this.leadRepository.getLeadById(event.accountId, leadId)
      : null;
    const account = await this.accountRepository.findOne(event.accountId);

    const target = String(config.target || "account").toLowerCase();
    const emails = new Set<string>();

    if (target === "lead_owner" || target === "lead owner") {
      const ownerId = String(
        lead?.assignedTo ||
          (typeof event?.assignedTo === "object"
            ? (event.assignedTo as any)?.userId || (event.assignedTo as any)?.id
            : event?.assignedTo) ||
          "",
      );
      if (ownerId) {
        const owner = await this.userRepository.findById(ownerId);
        if (owner?.email) emails.add(owner.email);
      }
    } else if (target === "user" && config.user) {
      const user = await this.userRepository.findById(config.user);
      if (user?.email) emails.add(user.email);
    } else {
      if (account?.email) emails.add(account.email);
    }

    const payload = lead || event;
    for (const email of emails) {
      await this.emailService.queueLeadNotificationEmail({
        email,
        lead: payload,
      });
    }
  }
}
