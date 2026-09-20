import { SarvamAIClient } from "sarvamai";
import { ENV } from "../../../../constants/index.js";
import logger from "../../../../utils/logger.js";

const JSON_SYSTEM =
  "Return compact JSON only. First key must be replyText. No markdown, no reasoning.";
const LLM_TIMEOUT_MS = 12_000;

export class AiAgentLlmService {
  private sarvam = new SarvamAIClient({
    apiSubscriptionKey: ENV.AI.SARVAM_API_KEY,
  });

  async generate(prompt: string) {
    const model = ENV.AI.SARVAM_MODEL || "sarvam-105b-conversations";
    if (!ENV.AI.SARVAM_API_KEY) throw new Error("SARVAM_API_KEY is not configured");

    const started = Date.now();
    const response = await Promise.race([
      this.sarvam.chat.completions({
        model: model as any,
        messages: [
          { role: "system", content: JSON_SYSTEM },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        top_p: 1,
        max_tokens: 500,
        reasoning_effort: null,
      } as any),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("LLM_TIMEOUT")), LLM_TIMEOUT_MS);
      }),
    ]);

    logger.info("WHATSAPP_AI_AGENT_LLM", {
      provider: "sarvam",
      model,
      latencyMs: Date.now() - started,
    });
    return String((response as any)?.choices?.[0]?.message?.content || "");
  }
}

export const aiAgentLlmService = new AiAgentLlmService();
