import { GoogleGenAI } from "@google/genai";
import { ENV } from "../constants";

export class GeminiAIUtil {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    this.ai = new GoogleGenAI({
      apiKey: apiKey || ENV.GOOGLE_GENAI_API_KEY,
    });
  }
  public chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start += chunkSize - overlap;
    }
    return chunks;
  }

  public async generateEmbedding(text: string | string[]) {
    const contents = Array.isArray(text) ? text : [text];

    if (!contents.length) throw new Error("No text provided for embedding.");

    try {
      const response = await this.ai.models.embedContent({
        model: "gemini-embedding-001",
        contents,
        config: {
          outputDimensionality: 1536,
        },
      });

      if (!response.embeddings || response.embeddings.length === 0) {
        throw new Error("No embeddings returned from Gemini AI");
      }
      return response.embeddings.map((e) => e.values ?? []);
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }
}
