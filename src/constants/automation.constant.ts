export const AUTOMATION_TRIGGERS = {
  LEAD_CREATED: "LEAD_CREATED",
  LEAD_STAGE_CHANGED: "LEAD_STAGE_CHANGED",
  LEAD_ASSIGNED: "LEAD_ASSIGNED",
  /** Alias kept for older records */
  LEAD_STATUS_CHANGED: "LEAD_STATUS_CHANGED",
  CONVERSATION_CREATED: "CONVERSATION_CREATED",
  CONVERSATION_CLOSED: "CONVERSATION_CLOSED",
  CONTACT_CREATED: "CONTACT_CREATED",
} as const;

export const AUTOMATION_TRIGGER_VALUES = Object.values(AUTOMATION_TRIGGERS);

export const CONDITION_OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  CONTAINS: "contains",
  NOT_CONTAINS: "not_contains",
  IS_EMPTY: "is_empty",
  IS_NOT_EMPTY: "is_not_empty",
} as const;

export const CONDITION_OPERATOR_VALUES = Object.values(CONDITION_OPERATORS);

export const AUTOMATION_ACTIONS = {
  ASSIGN_LEAD_TO_USER: "assign_lead_to_user",
  CREATE_TASK: "create_task",
  SEND_NOTIFICATION: "send_notification",
  UPDATE_LEAD_STAGE: "update_lead_stage",
  ADD_LEAD_TAG: "add_lead_tag",
} as const;

export const AUTOMATION_ACTION_VALUES = Object.values(AUTOMATION_ACTIONS);

/** Human labels from FE → payload paths on lead / conversation / contact */
export const CONDITION_FIELD_PATHS: Record<string, string> = {
  "Lead Source": "source.name",
  "Lead Stage": "stage",
  "Lead Stages": "stage", // legacy
  "Lead Status": "stage", // legacy UI label → stage
  "Previous Stage": "previousStage",
  "Assigned User": "assignedTo",
  "Lead Tags": "tags",
  Company: "company",
  "Score Level": "scoreLevel",
  "Conversation Platform": "platform",
  "Conversation Status": "status",
  "Contact Source": "source",
  "Contact Status": "status",
};

export const CONDITION_FIELD_LABELS = Object.keys(CONDITION_FIELD_PATHS);

export const AUTOMATION_STATUSES = ["draft", "published"] as const;

/** Status keys that mean a conversation is closed (config may use any of these) */
export const CONVERSATION_CLOSED_STATUS_KEYS = new Set([
  "closed",
  "resolved",
  "done",
  "completed",
  "archived",
]);
