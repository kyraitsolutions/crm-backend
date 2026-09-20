export const CHATFLOW_SESSION_STATUS = {
  WAITING: "waiting",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TChatFlowSessionStatus =
  (typeof CHATFLOW_SESSION_STATUS)[keyof typeof CHATFLOW_SESSION_STATUS];
