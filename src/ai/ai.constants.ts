import { ENV } from "../constants";

export const AI_MODELS = {
  FAST: ENV.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview",
  PRO: "gemini-2.0-pro"
};
