import { AI_AGENT_SKILL_KEY } from "./ai-agent.constant.js";

export const SKILL_ICON_KEYS = [
  "tag",
  "gauge",
  "filter",
  "package",
  "handshake",
  "calendar",
  "shield",
  "star",
  "wallet",
  "gem",
  "zap",
] as const;

export type TSkillIconKey = (typeof SKILL_ICON_KEYS)[number];

export type TAiSkillCatalogItem = {
  type: string;
  name: string;
  icon: TSkillIconKey;
  whenToUse: string;
  instructions: string;
  builtIn: boolean;
};

export type TAiSkillSuggestion = {
  id: string;
  label: string;
  name: string;
  icon: TSkillIconKey;
  whenToUse: string;
  instructions: string;
};

export const AI_AGENT_SKILL_CATALOG: TAiSkillCatalogItem[] = [
  {
    type: AI_AGENT_SKILL_KEY.HANDLE_SUPPORT,
    name: "FAQ / Support",
    icon: "zap",
    whenToUse:
      "The contact asks a general question about the business — products, pricing, policies, hours, location, delivery areas, services, or “do you have/do you offer X”. Use this whenever the answer should come from the business’s own knowledge. Do NOT use it for order-specific lookups (use Order Status), for a buyer who wants to purchase/qualify (use Lead Qualification), or for returns (use Returns).",
    instructions:
      "Answer from attached knowledge. If the issue is a complaint, unknown, or needs live order data, hand off.",
    builtIn: true,
  },
  {
    type: AI_AGENT_SKILL_KEY.HUMAN_HANDOFF,
    name: "Human Handoff",
    icon: "zap",
    whenToUse:
      "The contact explicitly asks for a human/agent/manager, is clearly frustrated after you’ve tried to help, raises something out of the bot’s scope, or the matter is sensitive (billing dispute, fraud, complaint, legal). Use it to hand off cleanly — not as an escape from questions you haven’t tried to answer yet.",
    instructions:
      "When the customer asks for a person, or confidence is low, stop automation and escalate. Collect required details first if they are configured.",
    builtIn: true,
  },
  {
    type: AI_AGENT_SKILL_KEY.LEAD_QUALIFICATION,
    name: "Lead Qualification",
    icon: "filter",
    whenToUse:
      "Use this skill when a customer shows interest in purchasing your product, requests a demo, asks about pricing, or wants to know if our solution is suitable for their business.",
    instructions:
      "Collect missing qualification fields one or two at a time. Do not invent budget, timeline, or requirements. Once the required details are collected, offer to connect the customer with the sales team.",
    builtIn: true,
  },
  {
    type: AI_AGENT_SKILL_KEY.APPOINTMENT_BOOKING,
    name: "Appointment booking",
    icon: "calendar",
    whenToUse: "Customer wants to book a visit, demo or callback.",
    instructions:
      "Collect dates and guest or attendee details, then use live availability tools. Never invent slots or prices.",
    builtIn: true,
  },
];

export const CUSTOM_SKILL_SUGGESTIONS: TAiSkillSuggestion[] = [
  {
    id: "bulk_wholesale",
    label: "Bulk / wholesale",
    name: "Bulk & wholesale orders",
    icon: "package",
    whenToUse: "Customer asks about ordering in bulk or business pricing.",
    instructions:
      "Collect company name and quantity, then share the wholesale rate card and create a lead.",
  },
  {
    id: "appointment_booking",
    label: "Appointment booking",
    name: "Appointment booking",
    icon: "calendar",
    whenToUse: "Customer wants to book a visit, demo or callback.",
    instructions:
      "Collect preferred date, time, and contact details. Confirm only from live availability. Never invent slots.",
  },
  {
    id: "warranty_claim",
    label: "Warranty claim",
    name: "Warranty claim",
    icon: "shield",
    whenToUse:
      "Use this skill when a customer wants to start a warranty claim or asks if a product is still under warranty.",
    instructions:
      "Ask for the product name, purchase date, and issue description. Then hand off to a teammate if a claim must be filed.",
  },
  {
    id: "feedback",
    label: "Feedback",
    name: "Feedback collection",
    icon: "star",
    whenToUse:
      "Use this skill when a customer wants to leave feedback, a review, or a complaint about their experience.",
    instructions:
      "Ask for a short description of their experience and a rating if useful. Thank them. Hand off if they are upset.",
  },
];

export const DEFAULT_SKILL_TYPES = [
  AI_AGENT_SKILL_KEY.HANDLE_SUPPORT,
  AI_AGENT_SKILL_KEY.HUMAN_HANDOFF,
] as const;

export const isBuiltInSkillType = (type: string) =>
  AI_AGENT_SKILL_CATALOG.some((item) => item.type === type);

export const findSkillCatalogItem = (type: string) =>
  AI_AGENT_SKILL_CATALOG.find((item) => item.type === type) || null;

export const isAllowedSkillIcon = (icon: string): icon is TSkillIconKey =>
  SKILL_ICON_KEYS.includes(icon as TSkillIconKey);

export const catalogItemToSkill = (item: TAiSkillCatalogItem) => ({
  key: item.type,
  type: item.type,
  enabled: true,
  name: item.name,
  icon: item.icon,
  whenToUse: item.whenToUse,
  instructions: item.instructions,
  config: { collectFields: [], connectedToolKeys: [] },
});
