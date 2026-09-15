import { SarvamAIClient } from "sarvamai";
import { ENV } from "../../../../constants/index.js";
import logger from "../../../../utils/logger.js";

const JSON_SYSTEM = "Return only valid JSON for the WhatsApp sales agent. No markdown.";

export class AiAgentLlmService {
  private sarvam = new SarvamAIClient({
    apiSubscriptionKey: ENV.AI.SARVAM_API_KEY,
  });

  async generate(prompt: string) {
    const model = ENV.AI.SARVAM_MODEL || "sarvam-105b-conversations";
    if (!ENV.AI.SARVAM_API_KEY) throw new Error("SARVAM_API_KEY is not configured");

    const response = await this.sarvam.chat.completions({
      model: model as any,
      messages: [
        { role: "system", content: JSON_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      top_p: 1,
      max_tokens: 2000,
    });

    logger.info("WHATSAPP_AI_AGENT_LLM", { provider: "sarvam", model });
    return String(response?.choices?.[0]?.message?.content || "");
  }
}

export const aiAgentLlmService = new AiAgentLlmService();
