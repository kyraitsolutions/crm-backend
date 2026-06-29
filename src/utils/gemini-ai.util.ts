import { GoogleGenAI } from "@google/genai";
import { ENV } from "../constants/index.js";

export class GeminiAIUtilsfd {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({
      apiKey: apiKey || ENV.AI.GOOGLE_GENAI_API_KEY,
    });
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

  public async runAI({ prompt, model = "gemini-1.5-pro" }: any) {
    if (!prompt) {
      throw new Error("Prompt is required");
    }
    try {
      const result = await this.ai.models.generateContent({
        model,
        contents: prompt,
      });
      return result.text ?? "";
    } catch (error) {
      console.error("Gemini AI generation failed:", error);
      throw error;
    }
  }
}
