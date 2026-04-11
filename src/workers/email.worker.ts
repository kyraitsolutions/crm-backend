import dotenv from "dotenv";

import { emailQueue } from "../queue/queue";
import logger from "../utils/logger";
import { EmailUtils } from "../utils/email.utils";

dotenv.config();

const emailUtils = new EmailUtils();

emailQueue.process("welcome-email", async (job) => {
  const { email, url } = job.data;
  logger.info(`Processing welcome email for ${email}`);
  await emailUtils.sendWelcomeEmail(email, url);
});

emailQueue.process("account-creation-email", async (job) => {
  const { accountEmail, accountName } = job.data;
  logger.info(`Processing welcome email for ${accountEmail}`);
  await emailUtils.sendAccountCreationEmail(accountEmail, accountName);
});

emailQueue.process("campaign-email", async (job) => {
  const { to, name, subject, html, fromEmail } = job.data;

  const personalizedHtml = html.replace("{{name}}", name || "there");

  await emailUtils.sendEmail(
    to,
    subject,
    personalizedHtml,
    undefined,
    fromEmail,
  );
});

emailQueue.process("lead-acknowledgement-email", async (job) => {
  const { email, lead } = job.data;

  console.log("job data", job.data);
  console.log(job);

  logger.info(`Processing lead acknowledgement email for ${email}`);
  await emailUtils.sendLeadAcknowledgementEmail(email, lead);
});
