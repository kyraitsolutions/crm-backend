export function safeJsonParse(text: string) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("No JSON found in AI response");
    }

    const jsonString = text.substring(start, end + 1);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("AI JSON parse failed:", text);
    throw new Error("Invalid AI response format");
  }
}
