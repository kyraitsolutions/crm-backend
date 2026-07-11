import redisClient from "../config/redis.js";
import { ENV } from "../constants/env.constants.js";
import { OTPUtil } from "../utils/otp.util.js";




export class OTPService {
    async issueOTP(email: string): Promise<string> {

        const otp = await OTPUtil.generateOTP();
        const hashed = await OTPUtil.hashOTP(otp);

        const redisKey = await OTPUtil.otpRedisKey(email);
        const attemptsKey = await OTPUtil.otpAttemptsKey(email);

        console.log("redis key",redisKey,attemptsKey)
        // saved hased into redis for temparory session, and return plain otp 
        await redisClient.set(redisKey, hashed, Number(ENV.AUTH?.OTP_TTL_SECONDS));
        await redisClient.del(attemptsKey);
        return otp;
    }

    async verifyOTP(email: string, submittedOtp: string): Promise<boolean> {

        const key = await OTPUtil.otpRedisKey(email);
        const attemptsKey = await OTPUtil.otpAttemptsKey(email);


        const storedHash = await redisClient.get(key);
        // const storedHash = "jhg";

        if (!storedHash) {
            throw new Error("OTP expired or not requested. Please request a new one.")
        }
        const attempts = await redisClient.incrementRateLimit(attemptsKey, Number(ENV.AUTH.OTP_TTL_SECONDS) * 1000)

        if (attempts > Number(ENV.AUTH.MAX_ATTEMPTS)) {
            await redisClient.del(key);
            throw new Error("Too many attempts. Please request a new code.");
        }
        // fetch hashed otp from radis match and check all the condition and delete key later once success
        const submittedHashOtp = await OTPUtil.hashOTP(submittedOtp);
        const isValid = storedHash === submittedHashOtp;
        if (isValid) {
            await redisClient.del(key);
            await redisClient.del(attemptsKey);
        }

        return isValid;
    }
}