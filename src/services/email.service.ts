import logger from "../utils/logger.js";
import { emailQueue } from "../queue/queue.js";
import { EmailRepository } from "../repositories/email.repository.js";
import { TEmailTemplate } from "../types/email.type.js";

export class EmailService {
  private emailRepository: EmailRepository;

  constructor() {
    this.emailRepository = new EmailRepository();
  }

  async startCampaign({
    accountId,
    leadIds,
    subject,
    html,
    fromEmail,
  }: {
    accountId: string;
    leadIds: { email: string; name?: string; id?: string }[];
    subject: string;
    html: string;
    fromEmail: string;
  }): Promise<void> {
    if (!leadIds.length) {
      throw new Error("No leads provided for campaign");
    }

    for (let i = 0; i < leadIds.length; i++) {
      const lead = leadIds[i];

      await emailQueue.add(
        "send-campaign-email",
        {
          to: lead.email,
          name: lead.name || "",
          subject,
          html,
          fromEmail,
          accountId,
          leadId: lead.id,
        },
        {
          delay: i * 300, // ⏳ rate limit safety (VERY IMPORTANT)
          attempts: 3,
        },
      );
    }

    logger.info(
      `📨 Email campaign queued | account=${accountId} | emails=${leadIds.length}`,
    );
  }

  async getSubscribers(accountId: string): Promise<any[]> {
    const subscribers = await this.emailRepository.getSubscribers(accountId);
    return subscribers;
  }
  // async deleteSubscriber(accountId:string,contactId:string):Promise<any|null>{
  //     const result=await this.emailRepository.deleteSubscriber(accountId,contactId);
  //     return result;
  // }

  // async getTemplates(accountId:string):Promise<any[]>{
  //     const templates=await this.emailRepository.getTemplates(accountId);
  //     return templates;
  // }
  // async getTemplateById(accountId:string,templateId:string):Promise<any|null>{
  //     const template=await this.emailRepository.getTemplateById(accountId,templateId);
  //     return template;
  // }
  async createTemplate(
    accountId: string,
    templateData: TEmailTemplate,
  ): Promise<any> {
    console.log("Template data:", templateData);
    // const template=await this.emailRepository.createTemplate(accountId,templateData);
    // return template;
    return;
  }
  // async updateTemplate(accountId:string,templateId:string,updateData:any):Promise<any|null>{
  //     const template=await this.emailRepository.updateTemplate(accountId,templateId,updateData);
  //     return template;
  // }
  // async deleteTemplate(accountId:string,templateId:string):Promise<any|null>{
  //     const result=await this.emailRepository.deleteTemplate(accountId,templateId);
  //     return result;
  // }

  async queueWelcomeEmail(email: string, url: string): Promise<void> {
    await emailQueue.add("welcome-email", {
      email,
      url,
    });
    logger.info(`Welcome email queued for ${email}`);
  }

  // Account Creation Mail
  async queueAccountCreationEmail(
    accountEmail: string,
    accountName: string,
  ): Promise<void> {
    logger.info(`Account created email ${accountEmail}`);
    await emailQueue.add("account-creation-email", {
      accountEmail,
      accountName,
    });
    logger.info(`Account Creation email queued for ${accountEmail}`);
  }

  async queueLeadAcknowledgementEmail(email: string, lead: any): Promise<void> {
    console.log("aaya");
    console.log(lead);
    await emailQueue.add("lead-acknowledgement-email", {
      email,
      lead,
    });
    logger.info(`Lead Acknowledgement email queued for ${email}`);
  }
}

// export const emailService = new EmailService();
// export default emailService;
