import dotenv from "dotenv";

import { emailQueue } from "../queue/queue.js";
import logger from "../utils/logger.js";
import { EmailUtils } from "../utils/email.utils.js";
import { QUEUE_JOBS } from "../constants/queue-jobs.constant.js";
import { EmailRepository } from "../repositories/email.repository.js";
import { initDB } from "../db/index.js";
import mongoose from "mongoose";

dotenv.config();

const emailUtils = new EmailUtils();
const emailRepository= new EmailRepository();

async function startWorker() {
  try {
    await initDB();

    console.log(
      "Worker Mongo State:",
      mongoose.connection.readyState
    );

    registerProcessors();
  } catch (error) {
    console.error("Worker startup failed", error);
    process.exit(1);
  }
}
function registerProcessors() {
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

emailQueue.process(
  "send-email-activity",
  async (job) => {
    const { emailActivityId, to, name, subject, html, fromEmail, } = job.data;

    try {
      const personalizedHtml = html.replace("{{name}}", name || "there");

      // send email
      const result = await emailUtils.sendEmail(to, subject, personalizedHtml, undefined, fromEmail);
      console.log("jkhj",result)
      // update DB success
      console.log(emailActivityId);
      const messageId=result?.messageId??"";
      await emailRepository.updateEmailStatus(emailActivityId,"sent",messageId,null);

    } catch (error: any) {
      console.log("Error:",error)

      // update DB failed
      await emailRepository.updateEmailStatus(emailActivityId,"faild","",error);

      throw error;
    }
  }
);

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

}

startWorker();