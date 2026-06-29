import dotenv from "dotenv";

import { emailQueue } from "../queue/queue.js";
import logger from "../utils/logger.js";
import { EmailUtils } from "../utils/email.utils.js";
import { QUEUE_JOBS } from "../constants/queue-jobs.constant.js";
import { EmailActivity } from "../models/emailActivity.model.js";

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

emailQueue.process("send-email-activity", async (job) => {
  const { emailActivityId, to, name, subject, html, fromEmail } = job.data;

  try {
    const personalizedHtml = html.replace("{{name}}", name || "there");

    // send email
    const result = await emailUtils.sendEmail(
      to,
      subject,
      personalizedHtml,
      undefined,
      fromEmail,
    );

    // update DB success
    await EmailActivity.findByIdAndUpdate(emailActivityId, {
      status: "sent",
      sentAt: new Date(),
      messageId: result?.messageId,
    });
  } catch (error: any) {
    // update DB failed
    await EmailActivity.findByIdAndUpdate(emailActivityId, {
      status: "failed",
      error: error.message,
    });

    throw error;
  }
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

emailQueue.process(QUEUE_JOBS.SEND_TASK_ASSIGNED_EMAIL, async (job) => {
  const { email, task } = job.data;
  await emailUtils.sendTaskAssignedEmail(email, task);
  // await emailUtils.sendEmail(
  //   email,
  //   `New Task Assigned: ${task?.taskTitle}`,
  //   `New Task Assigned: ${task?.taskTitle}`,
  // );
});

emailQueue.process(QUEUE_JOBS.SEND_LEAD_ASSIGNED_EMAIL, async (job) => {
  const { email, lead } = job.data;
  await emailUtils.sendLeadAssignedEmail(email, lead);
});
