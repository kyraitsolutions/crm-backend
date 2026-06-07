import { LeadRespository } from "../repositories/lead.respository";

export default class ActionExecutor {
  private leadRepository = new LeadRespository();

  constructor() {
    this.leadRepository = new LeadRespository();
  }
  async execute(actions: any[], event: any) {
    for (const action of actions) {
      switch (action.type) {
        case "assign-lead-to-user":
          await this.assignLead(event, action.config);
          break;

        case "create-task":
          await this.createTask(event, action.config);
          break;

        case "send-notification":
          await this.sendNotification(event, action.config);
          break;
      }
    }
  }

  private async assignLead(event: any, config: any) {
    this.leadRepository.updateLeadById(event.payload._id, {
      assignedTo: config.user,
    });
  }
  private async createTask(event: any, config: any) {}
  private async sendNotification(event: any, config: any) {}
}
