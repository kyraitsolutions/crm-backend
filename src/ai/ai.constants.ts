import { ENV } from "../constants/env.constants.js";

export const AI_MODELS = {
  FAST: ENV.AI.GOOGLE_GENAI_MODEL || "gemini-3-flash-preview",
  PRO: "gemini-2.0-pro",
};
