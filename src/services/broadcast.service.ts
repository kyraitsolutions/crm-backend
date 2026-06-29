import logger from "../utils/logger.js";
import { emailQueue } from "../queue/queue.js";
// import { EmailRepository } from '../repositories/email.repository.js';

export class BroadcastService {
  // private emailRepository:EmailRepository;

  constructor() {
    // this.emailRepository=new EmailRepository();
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
}
