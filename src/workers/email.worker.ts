import dotenv from "dotenv";

import { emailQueue } from "../queue/queue";
import logger from "../utils/logger";
import { EmailUtils } from "../utils/email.utils";
import { QUEUE_JOBS } from "../constants/queue-jobs.constant";

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

emailQueue.process(QUEUE_JOBS.LEAD_ACKNOWLEDGEMENT_EMAIL, async (job) => {
  const { email, lead } = job.data;

  logger.info(`Processing lead acknowledgement email for ${email}`);
  await emailUtils.sendLeadAcknowledgementEmail(email, lead);
});

emailQueue.process(QUEUE_JOBS.SEND_ONBOARDING_EMAIL, async (job) => {
  const {
    organizationName,
    firstName,
    lastName,
    email,
    dashboardUrl,
    supportEmail,
    createdAt,
    year,
  } = job.data;
  await emailUtils.sendOnboardingSuccessEmail({
    organizationName,
    firstName,
    lastName,
    email,
    dashboardUrl,
    supportEmail,
    createdAt,
    year,
  });
});
