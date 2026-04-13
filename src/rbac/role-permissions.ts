import { USERROLE } from "./roles";

export const ROLE_PERMISSIONS: Record<USERROLE, string[]> = {
  [USERROLE.ADMIN]: ["*"],

  [USERROLE.ACCOUNT_MANAGER]: [
    "account:view",
    "lead:*",
    "chatbot:*",
    "team:view",
    "team:update",
  ],

  [USERROLE.TEAM_MEMBER]: [],

  [USERROLE.LEAD_MANAGER]: [],
};
