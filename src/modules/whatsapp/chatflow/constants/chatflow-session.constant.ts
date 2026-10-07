export const CHATFLOW_SESSION_STATUS = {
  WAITING: "waiting",
  DELAYED: "delayed",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TChatFlowSessionStatus =
  (typeof CHATFLOW_SESSION_STATUS)[keyof typeof CHATFLOW_SESSION_STATUS];
