export const AUTOMATION_TRIGGERS = {
  LEAD_CREATED: "LEAD_CREATED",
  LEAD_UPDATED: "LEAD_UPDATED",
  LEAD_ASSIGNED: "LEAD_ASSIGNED",
  LEAD_STATUS_CHANGED: "LEAD_STATUS_CHANGED",
} as const;

export const CONDITION_OPERATORS = {
  EQUALS: "equals",
  NOT_EQUALS: "not_equals",
  CONTAINS: "contains",
  NOT_CONTAINS: "not_contains",
} as const;

export const AUTOMATION_ACTIONS = {
  ASSIGN_LEAD_TO_USER: "assign_lead_to_user",
  CREATE_TASK: "create_task",
  SEND_NOTIFICATION: "send_notification",
} as const;

export const AUTOMATION_CONDITION_FIELDS = {
  LEAD_STATUS: {
    label: "Lead Status",
    value: "stage",
  },

  LEAD_SOURCE: {
    label: "Lead Source",
    value: "source.name",
  },

  ASSIGNED_USER: {
    label: "Assigned User",
    value: "assignedUser",
  },
} as const;
