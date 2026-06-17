// config/email.js
import nodemailer from "nodemailer";
import { ENV } from "../constants";
import logger from "../utils/logger.js";

console.log("ENV", ENV);
export class Transporter {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: ENV.SMTP.SMTP_HOST,
      port: parseInt(ENV.SMTP.SMTP_PORT || "587"),
      secure: true, // true for 465, false for other ports
      auth: {
        user: ENV.SMTP.SMTP_USER,
        pass: ENV.SMTP.SMTP_PASS,
      },
      debug: false,
      logger: false,
    });
    this.verifyConnection();
  }
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info("Email service connection verified successfully");
    } catch (error) {
      logger.error("Email service connection failed:", error);
    }
  }
  async sendMail(mailOptions: any) {
    return this.transporter.sendMail(mailOptions);
  }
}
