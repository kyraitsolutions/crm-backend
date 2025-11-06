import transporter from "../config/email";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async ({ to, subject, html }:any) => {

    console.log("dhfkhadfkasdvv", process.env.SMTP_USER)
    const mailOptions = {
        from: `"Lotus CRM" <abhijeetsingh5631@gmail.com>`,
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        return { success: true, info };
    } catch (error) {
        return { success: false, error };
    }
};

export default sendEmail;
