import { EmailUtils } from "../utils/email.utils.js";
import { ENV } from "../constants/env.constants.js";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "../config/email.js";
import logger from "../utils/logger.js";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: { Name: string; Value: string }[];
};

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<{
    status: boolean;
    messageId: string | null;
    error?: string;
  }>;
}

const defaultFrom = () =>
  ENV.SMTP.AWS_FROM_EMAIL ||
  ENV.SMTP.FROM_EMAIL ||
  "support@kyraitsolutions.com";

export class SesEmailProvider implements EmailProvider {
  async sendEmail(input: SendEmailInput) {
    try {
      const fromEmail = input.fromEmail || defaultFrom();
      const source = input.fromName
        ? `${input.fromName} <${fromEmail}>`
        : fromEmail;

      const payload: Record<string, unknown> = {
        Source: source,
        ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
        Destination: { ToAddresses: [input.to] },
        Message: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: input.html, Charset: "UTF-8" },
            Text: {
              Data: input.text || input.html.replace(/<[^>]*>/g, ""),
              Charset: "UTF-8",
            },
          },
        },
      };
      if (process.env.SES_CONFIGURATION_SET) {
        payload.ConfigurationSetName = process.env.SES_CONFIGURATION_SET;
      }
      if (input.tags?.length) {
        payload.Tags = input.tags;
      }
      const command = new SendEmailCommand(payload as any);

      const result = await sesClient.send(command);
      return { status: true, messageId: result.MessageId ?? null };
    } catch (error) {
      logger.error("SES send failed", { error: (error as Error).message });
      return {
        status: false,
        messageId: null,
        error: (error as Error).message,
      };
    }
  }
}

export class LegacyEmailProvider implements EmailProvider {
  private utils = new EmailUtils();

  async sendEmail(input: SendEmailInput) {
    const result = await this.utils.sendEmail(
      input.to,
      input.subject,
      input.html,
      input.text,
      input.fromEmail,
    );
    return result;
  }
}

export const marketingEmailProvider: EmailProvider = new SesEmailProvider();
