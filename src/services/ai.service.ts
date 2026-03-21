import { LeadRespository } from "../repositories/lead.respository.js";
// import { leadSummaryPrompt } from "../ai/ai.prompts.js";
import { GeminiAIUtil } from "../ai/ai.service.js";
import { safeJsonParse } from "../ai/ai.parsers.js";


export class AiService {
  private leadRepository: LeadRespository;
  private ai: GeminiAIUtil;

  constructor() {
    this.leadRepository = new LeadRespository();
    this.ai = new GeminiAIUtil()
  }

  async getLeadSummary(accountId: string, leadId: string): Promise<any> {
    const lead = await this.leadRepository.getLeadById(accountId, leadId);


    // For Gemini
    // const prompt=leadSummaryPrompt(lead);
    // const rawResponse = await this.ai.runGoogleAI({ prompt });

    // For Open AI
    const prompt = JSON.stringify(lead);
    console.log("prompt",prompt);
    const rawResponse = await this.ai.aiOperation(prompt,"generateLeadSummary");
    // console.log(rawResponse);

    if (!rawResponse) {
      return null
    }
    const result = safeJsonParse(rawResponse)
    return result;
  }
  async createTemplateContent(accountId: string,aiPrompt:string): Promise<any> {

    console.log("Account Id", accountId, "AI Prompt", aiPrompt);


    // For Gemini
    // const prompt=leadSummaryPrompt(lead);
    // const rawResponse = await this.ai.runGoogleAI({ prompt });

    // For Open AI
    const rawResponse = await this.ai.aiOperation(aiPrompt,"createEmailTemplate");
    console.log(rawResponse);

    if (!rawResponse) {
      return null
    }
    const result = safeJsonParse(rawResponse)
    return result;
  }
}
