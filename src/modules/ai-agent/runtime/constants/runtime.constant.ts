export const AI_AGENT_INTENT = {
  QUESTION: "question",
  BOOKING: "booking",
  SUPPORT: "support",
  QUALIFICATION: "qualification",
  HANDOFF: "handoff",
} as const;

export const AI_AGENT_ROUTE = {
  KNOWLEDGE: "knowledge",
  SKILL: "skill",
  TOOL: "tool",
  HANDOFF: "handoff",
  RESPOND: "respond",
} as const;

export const AI_AGENT_RUN_STATUS = {
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const AI_AGENT_CHANNEL = {
  TEST: "test",
  WHATSAPP: "whatsapp",
} as const;

export const HUMAN_REQUEST_PHRASES = [
  "human",
  "real person",
  "real agent",
  "speak to someone",
  "talk to someone",
  "talk to a person",
  "customer service",
  "representative",
  "agent please",
  "connect me",
];

export const COMPLAINT_PHRASES = [
  "complaint",
  "angry",
  "frustrated",
  "refund",
  "lawsuit",
  "terrible",
  "worst",
  "scam",
];
