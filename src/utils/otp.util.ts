
import crypto from "crypto"
import { ENV } from "../constants/env.constants.js";


export class OTPUtil{
    static async generateOTP():Promise<string>{
        return crypto.randomInt(0,10 ** Number(ENV.AUTH.OTP_LENGTH)).toString().padStart(Number(ENV.AUTH.OTP_LENGTH),'0');
    }
    static async hashOTP(otp:string):Promise<string>{
        return crypto.createHash("sha256").update(otp).digest("hex");
    }

    static async otpRedisKey(email:string):Promise<string>{
        return `otp:${email.toLowerCase()}`;
    }

    static async otpAttemptsKey(email:string):Promise<string>{
        return `otp:attempts:${email.toLowerCase()}`;
    }
}