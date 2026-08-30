import Razorpay from "razorpay";
import { config } from "./index.js";

// Password-4PDYqe2wPX@4WBg
export const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});
