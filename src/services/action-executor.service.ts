import { AUTOMATION_ACTIONS } from "../constants/automation.constant.js";
import { LeadRespository } from "../repositories/lead.respository.js";
import { TaskRepository } from "../repositories/task.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TActivityLog } from "../types/activityLog.type.js";
import { ActivityLogService } from "./activityLog.service.js";
import { EmailService } from "./email.service.js";

export default class ActionExecutor {
  private leadRepository = new LeadRespository();
  private taskRepository = new TaskRepository();
  private activityLogService = new ActivityLogService();
  private userRepository = new UserRepository();
  private emailService = new EmailService();

  constructor() {
    this.leadRepository = new LeadRespository();
    this.taskRepository = new TaskRepository();
    this.activityLogService = new ActivityLogService();
    this.userRepository = new UserRepository();
  }
  async execute(actions: any[], event: any) {
    for (const action of actions) {
      switch (action.type) {
        case AUTOMATION_ACTIONS.ASSIGN_LEAD_TO_USER:
          await this.assignLead(event, action.config);
          break;

        case AUTOMATION_ACTIONS.CREATE_TASK:
          await this.createTask(event, action.config);
          break;

        case AUTOMATION_ACTIONS.SEND_NOTIFICATION:
          await this.sendNotification(event, action.config);
          break;
      }
    }
  }
  private async assignLead(event: any, config: any) {
    console.log("ye hai event to", event);
    const oldDoc = await this.leadRepository.getLeadById(
      event.accountId,
      event.id,
    );

    const newDoc = await this.leadRepository.updateLeadById(event.id, {
      assignedTo: config.user,
    });

    const activityLogDataPayload: Partial<
      TActivityLog & { oldDoc: any; newDoc: any }
    > = {
      oldDoc,
      newDoc,
      accountId: String(event.accountId),
      organizationId: String(event.organizationId),

      entityType: "lead",
      entityId: String(event.id),

      actor: {
        type: "automation",
        id: event?.automationId,
        name: event?.automationName,
      },

      metadata: {
        leadName: event?.name,
      },
    };

    await this.activityLogService.logUpdate(activityLogDataPayload);

    const user = await this.userRepository.findById(config.user);

    await this.emailService.queueLeadAssignedEmail({
      email: user?.email,
      assigneeName: user?.email,
      leadName: newDoc.name,
      leadEmail: newDoc.email,
      leadPhone: newDoc.phone,
      leadSource: newDoc.source?.name,
      dashboardUrl: `https://kyraitsoultion@gmail.com`,
    });
  }
  private async createTask(event: any, config: any) {
    this.taskRepository.create({
      ...config,
      organizationId: event.organizationId,
      accountId: event.accountId,
      entityType: event.entityType,
      entityId: event.entityId,
      source: "automation",
    });

    // Activity Log
    const activityLogDataPayload: Partial<TActivityLog> = {
      accountId: String(event.accountId),
      organizationId: String(event.organizationId),

      entityType: "task",
      entityId: String(event.id),

      actor: {
        type: "automation",
        id: event?.payload?.automationId,
      },

      metadata: {
        title: config.title,
      },
    };
    await this.activityLogService.logCreate(activityLogDataPayload);

    const user = await this.userRepository.findById(config.assignedTo);

    await this.emailService.queueTaskAssignedEmail({
      email: user?.email as string,
      assigneeName: "",
      taskTitle: config?.title,
      taskDescription: config.description,
      priority: config.priority,
      dueDate: config.dueDate,
      leadName: event?.name,
      dashboardUrl: `${process.env.FRONTEND_URL}/tasks/`,
    });
  }

  private async sendNotification(event: any, config: any) {}
}
