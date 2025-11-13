import dotenv from "dotenv";

import { emailQueue } from "../config/queue";
import { EmailService } from "../services/email.service";
import logger from "../utils/logger";

dotenv.config();

const emailService = new EmailService();

emailQueue.process("send-welcome-email", async (job) => {
  const { email } = job.data;
  logger.info(`Processing welcome email for ${email}`);
  await emailService.sendWelcomeEmail(email);
});

emailQueue.process("send-account-creation-email", async (job) => {
  const { accountEmail, accountName } = job.data;
  logger.info(`Processing welcome email for ${accountEmail}`);
  await emailService.sendAccountCreationEmail(accountEmail, accountName);
});
