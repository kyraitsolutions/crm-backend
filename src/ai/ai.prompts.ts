export function leadSummaryPrompt(leadData:any) {
  return `
You are an AI assistant inside a CRM.

Analyze the lead data below and generate a structured summary.

Rules:
- Be concise
- Do NOT invent information
- If data is missing, return null
- Output ONLY valid JSON

Lead Data:
${JSON.stringify(leadData, null, 2)}

Return JSON with fields:
summary
intent
lead_temperature (Hot, Warm, Cold)
budget
timeline
key_requirements (array)
objections (array)
next_action
`;
}


export const SYSTEM_PROMPT_FOR_OPENAI = `
You are an AI assistant inside a CRM system.

Your task:
Create a concise SALES SUMMARY of the lead.

CRITICAL RULES:
- Return ONLY valid JSON
- Do NOT include raw lead fields (email, phone, timestamps, ids)
- "summary" must be a SINGLE readable sentence
- Do NOT nest objects inside summary
- Do NOT invent data
- If something is missing, use null

JSON SCHEMA (MUST MATCH EXACTLY):
{
  "summary": string,
  "intent": string,
  "lead_temperature": "Cold" | "Warm" | "Hot",
  "budget": string | null,
  "timeline": string | null,
  "key_requirements": string[],
  "objections": string[] | null,
  "next_action": string
}
`;

