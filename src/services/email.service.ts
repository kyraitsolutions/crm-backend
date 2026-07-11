import logger from "../utils/logger.js";
import { emailQueue } from "../queue/queue.js";
import { EmailRepository } from "../repositories/email.repository.js";
import { TEmailTemplate } from "../types/email.type.js";
import { QUEUE_JOBS } from "../constants/queue-jobs.constant.js";
import { EmailActivity } from "../models/emailActivity.model.js";

export class EmailService {
  private emailRepository: EmailRepository;

  constructor() {
    this.emailRepository = new EmailRepository();
  }
  async onboardingEmail({
    organizationName,
    firstName,
    lastName,
    email,
    dashboardUrl,
    supportEmail,
    createdAt,
    year,
  }: any): Promise<void> {
    await emailQueue.add(QUEUE_JOBS.SEND_ONBOARDING_EMAIL, {
      organizationName,
      firstName,
      lastName,
      email,
      dashboardUrl,
      supportEmail,
      createdAt,
      year,
    });
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
  async sendMultipleEmail({
    accountId,
    leadId,
    contactId,
    name,
    emails,
    subject,
    html,
    fromEmail,
  }: {
    accountId: string;
    leadId: string;
    contactId: string;
    name: string;
    emails: string[];
    subject: string;
    html: string;
    fromEmail: string;
  }): Promise<void> {
    if (!emails.length) {
      throw new Error("No leads provided for campaign");
    }
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      // 1: Create entery in database
      const emailActivity = await EmailActivity.create({
        accountId,
        leadId: leadId || null,
        contactId: contactId || null,
        to: email,
        subject,
        html,
        fromEmail,
        name: name,
        status: "queued",
        type: "follow_up",
      });

      // Step 2: Queue email
      await emailQueue.add(
        "send-email-activity",
        {
          emailActivityId: emailActivity._id,
          to: email,
          subject,
          html,
          fromEmail,

          accountId,
          leadId: leadId || "",
          contactId: contactId || "",

          name: name || "",
        },
        {
          delay: i * 300, // ⏳ rate limit safety (VERY IMPORTANT)
          attempts: 3,
        },
      );
    }

    logger.info(
      `📨 Email campaign queued | account=${accountId} | emails=${emails.length}`,
    );
  }

  async getSubscribers(accountId: string): Promise<any[]> {
    const subscribers = await this.emailRepository.getSubscribers(accountId);
    return subscribers;
  }

  async getTemplates(accountId: string): Promise<any[]> {
    const templates = await this.emailRepository.getTemplates(accountId);
    return templates;
  }
  // async getTemplateById(accountId:string,templateId:string):Promise<any|null>{
  //     const template=await this.emailRepository.getTemplateById(accountId,templateId);
  //     return template;
  // }
  async createTemplate(
    accountId: string,
    templateData: TEmailTemplate,
  ): Promise<any> {
    console.log("Template data:", templateData);
    const template = await this.emailRepository.createTemplate(
      accountId,
      templateData,
    );
    return template;
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
  async queueOTPEmail(email: string, otp: string): Promise<void> {
    await emailQueue.add("otp-email", {
      email,
      otp,
    });
    logger.info(`OTP email queued for ${email}`);
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
    await emailQueue.add("lead-acknowledgement-email", {
      email,
      lead,
    });
    logger.info(`Lead Acknowledgement email queued for ${email}`);
  }

  async queueTaskAssignedEmail(data: {
    email: string;
    assigneeName: string;
    taskTitle: string;
    taskDescription: string;
    priority: string;
    dueDate: string;
    leadName?: string;
    dashboardUrl: string;
  }): Promise<void> {
    const jobData = {
      email: data.email,
      task: data,
    };
    console.log("Job Data bata do", jobData);
    await emailQueue.add(QUEUE_JOBS.SEND_TASK_ASSIGNED_EMAIL, jobData);
    logger.info(`Task assignment email queued for ${data.email}`);
  }

  async queueLeadAssignedEmail(data: any): Promise<void> {
    console.log("Data bata do", data);
    const jobData = {
      email: data.email,
      lead: data,
    };
    await emailQueue.add(QUEUE_JOBS.SEND_LEAD_ASSIGNED_EMAIL, jobData);
    logger.info(`Lead assignment email queued for ${data.email}`);
  }
}

// export const emailService = new EmailService();
// export default emailService;
