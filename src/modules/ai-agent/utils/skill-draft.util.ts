import {
  CUSTOM_SKILL_SUGGESTIONS,
  SKILL_ICON_KEYS,
  isAllowedSkillIcon,
  type TSkillIconKey,
} from "../constants/skill-catalog.constant.js";

const TITLE_CASE = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export const guessSkillIcon = (text: string): TSkillIconKey => {
  const lower = text.toLowerCase();
  if (/(bulk|wholesale|order|package|box)/.test(lower)) return "package";
  if (/(appoint|book|demo|callback|slot|calendar)/.test(lower)) return "calendar";
  if (/(warranty|claim|shield|guarantee)/.test(lower)) return "shield";
  if (/(feedback|review|rating|star)/.test(lower)) return "star";
  if (/(lead|qualify|purchase|filter|demo)/.test(lower)) return "filter";
  if (/(price|payment|cost|wallet|quote)/.test(lower)) return "wallet";
  if (/(product|tag|catalog)/.test(lower)) return "tag";
  if (/(handshake|partner|b2b|business)/.test(lower)) return "handshake";
  if (/(speed|gauge|priority)/.test(lower)) return "gauge";
  if (/(gem|premium|vip)/.test(lower)) return "gem";
  return "zap";
};

export const sanitizeSkillDraft = (raw: Record<string, unknown>, fallbackText: string) => {
  const name = String(raw.name || "").trim() || TITLE_CASE(fallbackText) || "Custom skill";
  const whenToUse =
    String(raw.whenToUse || "").trim() ||
    `Use this skill when a customer asks about ${fallbackText || name}.`;
  const instructions =
    String(raw.instructions || "").trim() ||
    "Collect the details needed for this request one question at a time. Then complete the job or hand off to a teammate. Do not invent facts.";
  const iconRaw = String(raw.icon || "").trim();
  return {
    name: name.slice(0, 80),
    whenToUse,
    instructions,
    icon: isAllowedSkillIcon(iconRaw) ? iconRaw : guessSkillIcon(`${name} ${fallbackText}`),
  };
};

export const heuristicSkillDraft = (description: string, suggestion: string) => {
  const fromSuggestion = CUSTOM_SKILL_SUGGESTIONS.find(
    (item) =>
      item.id === suggestion ||
      item.label.toLowerCase() === suggestion.toLowerCase() ||
      item.name.toLowerCase() === suggestion.toLowerCase(),
  );
  if (fromSuggestion && !description) {
    return {
      name: fromSuggestion.name,
      whenToUse: fromSuggestion.whenToUse,
      instructions: fromSuggestion.instructions,
      icon: fromSuggestion.icon,
    };
  }
  const text = description || suggestion || "this request";
  return sanitizeSkillDraft(
    {
      name: TITLE_CASE(text),
      whenToUse: `Use this skill when a customer asks about ${text}.`,
      instructions:
        "Collect the details needed for this request one question at a time. Then complete the job or hand off to a teammate. Do not invent facts.",
      icon: guessSkillIcon(text),
    },
    text,
  );
};

export const allowedSkillIcons = () => [...SKILL_ICON_KEYS];
