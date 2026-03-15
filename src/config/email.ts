// config/email.js
import nodemailer from "nodemailer"
import dotenv from "dotenv";
import logger from "../utils/logger";

dotenv.config();

export class Transporter {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            debug: false,
            logger: false
        });
        this.verifyConnection();
    }
    private async verifyConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            logger.info('Email service connection verified successfully');
        } catch (error) {
            logger.error('Email service connection failed:', error);
        }
    }
    async sendMail(mailOptions: any) {
        return this.transporter.sendMail(mailOptions);
    }

}