import logger from "./logger";
import { Transporter } from "../config/email";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs";

export class EmailUtils {
  private transporter: Transporter;

  constructor() {
    this.transporter = new Transporter();
  }
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
    from?: string,
  ): Promise<boolean> {
    try {
      const mailOptions = {
        // from: "sushilkc261@gmail.com" || process.env.FROM_EMAIL,
        from: "sushilkc2611@gmail.com",
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML tags for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}:`, result.messageId);
      return true;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, url: string): Promise<boolean> {
    const subject = "Welcome to Kyra CRM";
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Kyra CRM!</h2>
                <p>Hello ${email.split("@")[0]},</p>
                <p>Thank you for signing up with our Kyra CRM. You can now start creating chatbots and managing your leads.</p>
                <p>Here's what you can do next:</p>
                <a href="${url}">Click on this url</a>
                <ul>
                    <li>Onboard yourself to get a base account</li>
                    <li>Create your first chatbot</li>
                    <li>Set up chatbot configurations</li>
                    <li>Configure lead collection</li>
                    <li>Monitor real-time conversations</li>
                </ul>
                <p>If you have any questions, feel free to contact our support team.</p>
                <p>Best regards,<br>The Kyra CRM Team</p>
            </div>
        `;

    return await this.sendEmail(email, subject, html);
  }

  async sendAccountCreationEmail(
    accountEmail: string,
    accountName: string,
  ): Promise<boolean> {
    const subject = `🎉Welcome Aboard — Your Account is Ready!`;

    const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
                <div style="background-color: #3b5d50; color: #ffffff; padding: 20px 30px;">
                    <h2 style="margin: 0; font-size: 22px;">Welcome to Kyra CRM 🎉</h2>
                </div>

                <div style="padding: 25px 30px; color: #333;">
                    <p style="font-size: 16px;">Hello <strong>${accountName}</strong>,</p>

                    <p style="font-size: 15px; line-height: 1.6;">
                        We’re thrilled to let you know that your new account has been successfully created using the email address:
                        <strong>${accountEmail}</strong>.
                    </p>

                    <div style="background-color: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 15px 20px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #3b5d50;">Account Details</h3>
                        <p style="margin: 5px 0;"><strong>Account Name:</strong> ${accountName}</p>
                        <p style="margin: 5px 0;"><strong>Email ID:</strong> ${accountEmail}</p>
                        <p style="margin: 5px 0;"><strong>Created On:</strong> ${new Date().toLocaleString()}</p>
                    </div>

                    <p style="font-size: 15px; line-height: 1.6;">
                        You can now log in to your dashboard to manage your chatbots, view analytics, and connect with your leads.
                    </p>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://kyracrm.kyraitsolutions.com/dashboard" style="display: inline-block; background-color: #3b5d50; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: bold;">
                            Go to Dashboard
                        </a>
                    </div>

                    <p style="margin-top: 30px; font-size: 13px; color: #777;">
                        If you didn’t sign up for this account, please ignore this email or contact our support team.
                    </p>

                    <p style="font-size: 14px; color: #333; margin-top: 20px;">
                        Best regards,<br>
                        <strong>Kyra IT Solutions</strong>
                    </p>
                </div>
            </div>
        `;

    return await this.sendEmail(accountEmail, subject, html);
  }

  async sendLeadAcknowledgementEmail(
    email: string,
    leadData: any,
  ): Promise<boolean> {
    try {
      const {
        accountName,
        name,
        phone,
        supportEmail,
        source: leadSource,
      } = leadData;
      const templatePath = path.join(
        process.cwd(),
        "src/templates/emails/lead-acknowledgement.hbs",
      );

      const source = fs.readFileSync(templatePath, "utf8");

      const template = Handlebars.compile(source);

      const html = template({
        name: name,
        email: email,
        phone: phone,
        source: leadSource?.name,
        accountName: accountName,
        supportEmail: supportEmail,
        year: new Date().getFullYear(),
      });

      // await this.transporter.sendMail({
      //   // from: `<${process.env.SMTP_USER}>`,
      //   from: `sushilkc2611@gmail.com`,
      //   to: email,
      //   subject: "We received your enquiry",
      //   html,
      // });

      await this.sendEmail(email, "We received your enquiry", html);

      return true;
    } catch (error) {
      console.error("Lead acknowledgement email error:", error);
      return false;
    }
  }
  //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  //             <h2 style="color: #333;">New Lead Generated!</h2>
  //             <p>A new lead has been generated from your chatbot: <strong>${chatbotName}</strong></p>

  //             <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
  //                 <h3 style="color: #333; margin-top: 0;">Lead Information:</h3>
  //                 <p><strong>Name:</strong> ${leadData.contactInfo?.firstName || 'N/A'} ${leadData.contactInfo?.lastName || ''}</p>
  //                 <p><strong>Email:</strong> ${leadData.contactInfo?.emails?.[0]?.address || 'N/A'}</p>
  //                 <p><strong>Phone:</strong> ${leadData.contactInfo?.phones?.[0]?.number || 'N/A'}</p>
  //                 <p><strong>Company:</strong> ${leadData.contactInfo?.company || 'N/A'}</p>
  //                 <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
  //             </div>

  //             <p>You can view and manage this lead in your dashboard.</p>
  //             <p>Best regards,<br>The CRM Chatbot Team</p>
  //         </div>
  //     `;

  //     return await this.sendEmail(profileEmail, subject, html);
  // }

  // async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  //     const subject = 'Password Reset Request';
  //     const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  //     const html = `
  //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  //             <h2 style="color: #333;">Password Reset Request</h2>
  //             <p>You requested a password reset for your account.</p>
  //             <p>Click the button below to reset your password:</p>
  //             <div style="text-align: center; margin: 30px 0;">
  //                 <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
  //             </div>
  //             <p>If the button doesn't work, copy and paste this link into your browser:</p>
  //             <p style="word-break: break-all; color: #666;">${resetUrl}</p>
  //             <p>This link will expire in 1 hour.</p>
  //             <p>If you didn't request this reset, please ignore this email.</p>
  //             <p>Best regards,<br>The CRM Chatbot Team</p>
  //         </div>
  //     `;

  //     return await this.sendEmail(email, subject, html);
  // }

  // async sendNotificationEmail(email: string, notification: any): Promise<boolean> {
  //     const subject = notification.title;
  //     const html = `
  //         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  //             <h2 style="color: #333;">${notification.title}</h2>
  //             <p>${notification.message}</p>
  //             ${notification.data ? `
  //                 <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
  //                     <h3 style="color: #333; margin-top: 0;">Details:</h3>
  //                     <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${JSON.stringify(notification.data, null, 2)}</pre>
  //                 </div>
  //             ` : ''}
  //             <p>Best regards,<br>The CRM Chatbot Team</p>
  //         </div>
  //     `;

  //     return await this.sendEmail(email, subject, html);
  // }

  // Queue-based email sending methods

  // async queueLeadNotificationEmail(profileEmail: string, leadData: any, chatbotName: string): Promise<void> {
  //     await emailQueue.add('send-lead-notification', {
  //         profileEmail,
  //         leadData,
  //         chatbotName
  //     });
  //     logger.info(`Lead notification email queued for ${profileEmail}`);
  // }

  // async queueNotificationEmail(email: string, notification: any): Promise<void> {
  //     await emailQueue.add('send-notification-email', {
  //         email,
  //         notification
  //     });
  //     logger.info(`Notification email queued for ${email}`);
  // }
  // Template methods
  generateEmailTemplate(templateName: string, data: any): string {
    const templates: { [key: string]: (data: any) => string } = {
      welcome: (data) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to CRM Chatbot Platform!</h2>
                    <p>Hello ${data.name},</p>
                    <p>Thank you for signing up with our CRM Chatbot platform.</p>
                    <p>Your profile ID is: <strong>${data.profileId}</strong></p>
                    <p>Best regards,<br>The CRM Chatbot Team</p>
                </div>
            `,
      "lead-notification": (data) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">New Lead Generated!</h2>
                    <p>A new lead has been generated from your chatbot: <strong>${data.chatbotName}</strong></p>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Lead Information:</h3>
                        <p><strong>Name:</strong> ${data.leadData.contactInfo?.firstName || "N/A"}</p>
                        <p><strong>Email:</strong> ${data.leadData.contactInfo?.emails?.[0]?.address || "N/A"}</p>
                        <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    <p>Best regards,<br>The CRM Chatbot Team</p>
                </div>
            `,
    };

    return templates[templateName] ? templates[templateName](data) : "";
  }
}
