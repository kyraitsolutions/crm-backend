import Razorpay from "razorpay";
import { config } from "./index.js";
import { HttpError } from "../utils/http.error.js";
import { SUBSCRIPTION_ERROR } from "../constants/subscription.constant.js";

export const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export function assertRazorpayConfigured() {
  const keyId = config.razorpay.keyId;
  const keySecret = config.razorpay.keySecret;
  if (!keyId || !keySecret) {
    throw HttpError.internal(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      undefined,
      SUBSCRIPTION_ERROR.PAYMENT_FAILED,
    );
  }
}

export function mapRazorpayError(error: unknown): HttpError {
  const err = error as any;
  const description =
    err?.error?.description ||
    err?.error?.reason ||
    (typeof err?.message === "string" ? err.message : null);

  if (err?.statusCode === 401 || err?.statusCode === 400 && /auth/i.test(String(description))) {
    return HttpError.internal(
      "Razorpay authentication failed. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      err?.error,
      SUBSCRIPTION_ERROR.PAYMENT_FAILED,
    );
  }

  return HttpError.badRequest(
    description || "Unable to create payment order. Please try again.",
    err?.error,
    SUBSCRIPTION_ERROR.PAYMENT_FAILED,
  );
}
