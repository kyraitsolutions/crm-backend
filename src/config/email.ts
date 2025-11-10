// config/email.js
import nodemailer from "nodemailer"
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: parseInt("465"),
    secure: true, // true for 465, false for other ports
    auth: {
        user: "abhijeetsingh5631@gmail.com",
        pass: "oqqgeuxgmrretjbr",
    },
    // Add these for better debugging
    debug: true,
    logger: true
});

// Test the connection
transporter.verify((error:any, success:any) => {
    if (error) {
        console.log('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server ready to take messages:',success);
    }
});


export default transporter;
