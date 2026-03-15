// permissions.ts
export const PERMISSIONS = {
  ACCOUNT: {
    VIEW: "account:view",
    CREATE: "account:create",
    UPDATE: "account:update",
    DELETE: "account:delete",
    ASSIGN: "account:assign",
  },

  LEAD: {
    VIEW: "lead:view",
    CREATE: "lead:create",
    UPDATE: "lead:update",
    DELETE: "lead:delete",
  },

  CHATBOT: {
    VIEW: "chatbot:view",
    CREATE: "chatbot:create",
    UPDATE: "chatbot:update",
    DELETE: "chatbot:delete",
  },

  TEAM: {
    CREATE: "team:create",
    DELETE: "team:delete",
  },
} as const;
