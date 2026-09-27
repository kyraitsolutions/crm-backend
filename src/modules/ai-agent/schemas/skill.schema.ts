import { z } from "zod";
import { AI_AGENT_SKILL_KEY } from "../constants/ai-agent.constant.js";
import { isBuiltInSkillType } from "../constants/skill-catalog.constant.js";

export const skillCollectFieldSchema = z.object({
  question: z.string().trim().min(1, "Question is required"),
  attribute: z.string().trim().min(1, "Attribute is required"),
  required: z.boolean(),
});

export const skillConfigSchema = z
  .object({
    collectFields: z.array(skillCollectFieldSchema).default([]),
    connectedToolKeys: z.array(z.string().trim().min(1)).default([]),
  })
  .passthrough();

export const skillSchema = z
  .object({
    key: z.string().trim().min(1, "Skill key is required"),
    type: z.string().trim().min(1, "Skill type is required"),
    enabled: z.boolean(),
    name: z.string().trim().min(1, "Skill name is required"),
    icon: z.string().trim().default("zap"),
    whenToUse: z.string().trim().default(""),
    instructions: z.string().trim().default(""),
    config: skillConfigSchema.default({
      collectFields: [],
      connectedToolKeys: [],
    }),
  })
  .superRefine((skill, ctx) => {
    const allowed =
      skill.type === AI_AGENT_SKILL_KEY.CUSTOM || isBuiltInSkillType(skill.type);
    if (!allowed) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid skill type: ${skill.type}`,
        path: ["type"],
      });
    }
  });

export const skillsArraySchema = z.array(skillSchema);

export const draftSkillRequestSchema = z.object({
  description: z.string().trim().default(""),
  suggestion: z.string().trim().optional(),
});
