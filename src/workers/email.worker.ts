import dotenv from "dotenv";

import { emailQueue } from "../config/queue";
import { EmailService } from "../services/email.service";
import logger from "../utils/logger";

dotenv.config();

const emailService = new EmailService();

emailQueue.process("send-welcome-email", async (job) => {
  const { email,url } = job.data;
  logger.info(`Processing welcome email for ${email}`);
  await emailService.sendWelcomeEmail(email,url);
});

emailQueue.process("send-account-creation-email", async (job) => {
  const { accountEmail, accountName } = job.data;
  logger.info(`Processing welcome email for ${accountEmail}`);
  await emailService.sendAccountCreationEmail(accountEmail, accountName);
});


emailQueue.process("send-campaign-email", async (job) => {
  const { to, name, subject, html, fromEmail } = job.data;

  const personalizedHtml = html.replace(
    "{{name}}",
    name || "there"
  );

  await emailService.sendEmail(
    to,
    subject,
    personalizedHtml,
    undefined,
    fromEmail
  );
});
