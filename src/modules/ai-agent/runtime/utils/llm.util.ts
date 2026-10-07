// import OpenAI from "openai";
import { ENV } from "../../../../constants/index.js";
import { config } from "../../../../config/index.js";
import logger from "../../../../utils/logger.js";
import { SarvamAIClient } from "sarvamai";

const TIMEOUT_MS = 12_000;

const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  if (!raw) return null;
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export type RuntimeLlmResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs = TIMEOUT_MS) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("RUNTIME_LLM_TIMEOUT")), timeoutMs);
    }),
  ]);

export class RuntimeLlm {
  isAvailable() {
    return Boolean(
      (config.ai.sarvamApiKey && config.ai.sarvamModel) ||
        (config.ai.groqApiKey && config.ai.groqModel) ||
        ENV.AI.OPENAI_API_KEY,
    );
  }

  async complete(params: {
    system: string;
    user: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }): Promise<RuntimeLlmResult> {
    if (config.ai.sarvamApiKey && config.ai.sarvamModel) return this.sarvam(params);
    // if (config.ai.groqApiKey && config.ai.groqModel) return this.grok(params);
    // if (ENV.AI.OPENAI_API_KEY) return this.openAi(params);
    throw new Error("No LLM API key configured");
  }

  async completeJson(params: {
    system: string;
    user: string;
    maxTokens?: number;
    timeoutMs?: number;
  }): Promise<Record<string, unknown> | null> {
    const result = await this.complete({
      ...params,
      json: true,
      temperature: 0,
      maxTokens: params.maxTokens ?? 700,
      timeoutMs: params.timeoutMs,
    });
    return parseJsonObject(result.text);
  }

  // private async grok(params: {
  //   system: string;
  //   user: string;
  //   json?: boolean;
  //   temperature?: number;
  //   maxTokens?: number;
  // }): Promise<RuntimeLlmResult> {
  //   const client = new OpenAI({
  //     apiKey: config.ai.groqApiKey,
  //     baseURL: "https://api.groq.com/openai/v1",
  //   });
  //   const started = Date.now();
    
  //   const response = await withTimeout(
  //     client.chat.completions.create({
  //       model: config.ai.groqModel || "llama-3.3-70b-versatile",
  //       messages: [
  //         { role: "system", content: params.system },
  //         { role: "user", content: params.user },
  //       ],
  //       temperature: params.temperature ?? 0.3,
  //       max_tokens: params.maxTokens ?? 400,
  //       ...(params.json ? { response_format: { type: "json_object" as const } } : {}),
  //     }),
  //   );

    
    
  //   logger.info("AI_AGENT_RUNTIME_LLM", {
  //     provider: "groq",
  //     model: config.ai.groqModel || "llama-3.3-70b-versatile",
  //     latencyMs: Date.now() - started,
  //   });

  //   console.log("response", response?.choices[0]?.message?.content);
  //   return {
  //     text: String(response.choices[0]?.message?.content || "").trim(),
  //     promptTokens: response.usage?.prompt_tokens || 0,
  //     completionTokens: response.usage?.completion_tokens || 0,
  //   };
  // }

  // private async openAi(params: {
  //   system: string;
  //   user: string;
  //   json?: boolean;
  //   temperature?: number;
  //   maxTokens?: number;
  // }): Promise<RuntimeLlmResult> {
  //   const client = new OpenAI({ apiKey: ENV.AI.OPENAI_API_KEY });
  //   const response = await withTimeout(
  //     client.chat.completions.create({
  //       model: ENV.AI.OPENAI_MODEL || "gpt-4o-mini",
  //       messages: [
  //         { role: "system", content: params.system },
  //         { role: "user", content: params.user },
  //       ],
  //       temperature: params.temperature ?? 0.3,
  //       max_tokens: params.maxTokens ?? 400,
  //       ...(params.json ? { response_format: { type: "json_object" as const } } : {}),
  //     }),
  //   );
  //   return {
  //     text: String(response.choices[0]?.message?.content || "").trim(),
  //     promptTokens: response.usage?.prompt_tokens || 0,
  //     completionTokens: response.usage?.completion_tokens || 0,
  //   };
  // }

  private async sarvam(params: {
    system: string;
    user: string;
    json?: boolean;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }): Promise<RuntimeLlmResult> {
    const client = new SarvamAIClient({
      apiSubscriptionKey: config.ai.sarvamApiKey,
    });
    const started = Date.now();
    const jsonRule = [
      "Reply with one JSON object and no other text.",
      "Do not describe the layout.",
    ].join(" ");

    const readText = (response: unknown) =>
      String(
        (response as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]
          ?.message?.content || "",
      ).trim();
    const ask = (user: string) =>
      client.chat.completions({
        model: config.ai.sarvamModel as never,
        messages: [
          {
            role: "system",
            content: params.json ? `${params.system}\n\n${jsonRule}` : params.system,
          },
          { role: "user", content: user },
        ],
        temperature: params.json ? 0 : (params.temperature ?? 0.3),
        max_tokens: params.maxTokens ?? 400,
      } as never);

    let response = await withTimeout(ask(params.user), params.timeoutMs);
    let text = readText(response);
    if (params.json && !parseJsonObject(text)) {
      response = await withTimeout(
        ask(
          `${params.user}\n\nYour last reply was not JSON:\n${text.slice(0, 400)}\nReply again with only the JSON object.`,
        ),
        params.timeoutMs,
      );
      text = readText(response);
    }

    logger.info("AI_AGENT_RUNTIME_LLM", {
      provider: "sarvam",
      model: config.ai.sarvamModel,
      latencyMs: Date.now() - started,
    });



    return {
      text,
      promptTokens: 0,
      completionTokens: 0,
    };
  }
}

export const runtimeLlm = new RuntimeLlm();
