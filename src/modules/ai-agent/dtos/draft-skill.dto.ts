import { HttpError } from "../../../utils/http.error.js";
import { draftSkillRequestSchema } from "../schemas/skill.schema.js";

export class DraftSkillDto {
  description: string;
  suggestion: string;

  constructor(data: Record<string, unknown>) {
    const parsed = draftSkillRequestSchema.safeParse(data);
    if (!parsed.success) {
      throw HttpError.badRequest(
        parsed.error.issues[0]?.message || "Invalid skill draft request",
      );
    }
    this.description = parsed.data.description;
    this.suggestion = parsed.data.suggestion || "";
    if (!this.description && !this.suggestion) {
      throw HttpError.badRequest(
        "Describe what this skill should do, or pick a suggestion",
      );
    }
  }
}
