import { GoogleGenAI } from "@google/genai";
import { ENV } from "../constants/index.js";
import { AI_MODELS } from "./ai.constants.js";
import OpenAi from "openai";
import { SYSTEM_PROMPT_FOR_OPENAI } from "./ai.prompts.js";

export class GeminiAIUtil {
    private googleAi: GoogleGenAI;
    private openAi: OpenAi;
    constructor(apiKey?: string) {
        this.googleAi = new GoogleGenAI({
            apiKey: apiKey || ENV.GOOGLE_GENAI_API_KEY,
        });
        this.openAi = new OpenAi({
            apiKey: ENV.OPENAI_API_KEY
        })
    }

    public async runGoogleAI({ prompt, model = AI_MODELS.FAST }: {
        prompt: string;
        model?: string;
    }) {

        if (!prompt) {
            throw new Error("Prompt is required");
        }
        try {
            const result = await this.googleAi.models.generateContent({
                model,
                contents: prompt,
            });
            return result.text ?? "";
        } catch (error) {
            console.error("Gemini AI generation failed:", error);
            throw error;
        }
    }

    public async runOpenAI(lead: string) {
        const res = await this.openAi.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: SYSTEM_PROMPT_FOR_OPENAI },
                { role: "user", content: lead }
            ],
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: "json_object" }
        });

        console.log("bhhj", res.choices[0].message.content);
        return res.choices[0].message.content;
    }


}





// public async generateEmbedding(text: string | string[]) {
//   const contents = Array.isArray(text) ? text : [text];

//   if (!contents.length) throw new Error("No text provided for embedding.");

//   try {
//     const response = await this.ai.models.embedContent({
//       model: "gemini-embedding-001",
//       contents,
//       config: {
//         outputDimensionality: 1536,
//       },
//     });

//     if (!response.embeddings || response.embeddings.length === 0) {
//       throw new Error("No embeddings returned from Gemini AI");
//     }
//     return response.embeddings.map((e) => e.values ?? []);
//   } catch (error) {
//     console.error("Failed to generate embedding:", error);
//     throw error;
//   }
// }