// // config/email.js
// import nodemailer from "nodemailer";
// import logger from "../utils/logger.js";
// import { ENV } from "../constants/env.constants.js";

// console.log("ENV", ENV);
// export class Transporter {
//   private transporter: nodemailer.Transporter;

//   constructor() {
//     this.transporter = nodemailer.createTransport({
//       host: ENV.SMTP.SMTP_HOST,
//       port: parseInt(ENV.SMTP.SMTP_PORT || "587"),
//       secure: false, // true for 465, false for other ports
//       auth: {
//         user: ENV.SMTP.SMTP_USER,
//         pass: ENV.SMTP.SMTP_PASS,
//       },
//       tls: {
//           rejectUnauthorized: false
//       },
//       debug: false,
//       logger: false,
//       connectionTimeout: 30000,
//       greetingTimeout: 30000,
//       socketTimeout: 30000,
//     });
//     this.verifyConnection();
//   }
//   private async verifyConnection(): Promise<void> {
//     try {
//       await this.transporter.verify();
//       console.log("SMTP Verified");
//       logger.info("Email service connection verified successfully");
//     } catch (error) {
//       logger.error("Email service connection failed:", error);
//     }
//   }
//   async sendMail(mailOptions: any) {
//     return this.transporter.sendMail(mailOptions);
//   }
// }
import { SESClient } from "@aws-sdk/client-ses";
import { ENV } from "../constants/env.constants.js";

export const sesClient = new SESClient({
  region:ENV.SMTP.AWS_EMAIL_REGION,
  credentials: {
    accessKeyId:ENV.SMTP.EMAIl_AWS_ACCESS_KEY_ID||"",
    secretAccessKey:ENV.SMTP.EMAIL_AWS_SECRET_KEY||""
  },
});


// test function
// await sesClient.send(
//   new SendEmailCommand({
//     Source: process.env.FROM_EMAIL!,
//     Destination: {
//       ToAddresses: ["test@gmail.com"],
//     },
//     Message: {
//       Subject: {
//         Data: "Hello",
//       },
//       Body: {
//         Html: {
//           Data: "<h1>Hello</h1>",
//         },
//       },
//     },
//   })
// );