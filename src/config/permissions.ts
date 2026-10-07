/**
 * Single source of truth for Kyra RBAC.
 *
 * Rules:
 * - Keys are `module.action` (dot notation).
 * - Modules are independent: granting `whatsapp.*` does NOT grant
 *   `whatsappMarketing.*` (and vice versa).
 * - Add a new product area by appending a section here, then:
 *   1) run seed/migrate
 *   2) gate BE routes with requirePermission("module.action")
 *   3) gate FE routes/sidebar with RequirePermission / hasPermission
 */

export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  ACCOUNT_MANAGER: "ACCOUNT_MANAGER",
};

export const DEFAULT_ROLES = ["ADMIN", "ACCOUNT_MANAGER"];

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "import"
  | "send";

export type PermissionModuleDef = {
  key: string;
  label: string;
  description?: string;
  actions: PermissionAction[];
};

export type PermissionSectionDef = {
  title: string;
  modules: PermissionModuleDef[];
};

/**
 * UI + seed catalog. Order here is Create Role UI order.
 * Prefer standard CRUD actions; use send/import only when product needs them.
 */
export const PERMISSION_CATALOG: PermissionSectionDef[] = [
  {
    title: "ACCOUNTS",
    modules: [
      {
        key: "accounts",
        label: "Accounts",
        actions: ["create", "edit", "delete", "view", "export"],
      },
    ],
  },
  {
    title: "ROLES & PRIVILEGES",
    modules: [
      {
        key: "role",
        label: "Roles",
        description: "Create and manage custom roles",
        actions: ["view", "create", "edit", "delete"],
      },
    ],
  },
  {
    title: "TEAM MANAGEMENT",
    modules: [
      {
        key: "teams",
        label: "Team Management",
        actions: ["create", "edit", "delete", "view"],
      },
    ],
  },
  {
    title: "LEADS",
    modules: [
      {
        key: "leads",
        label: "Leads",
        actions: ["create", "edit", "delete", "view", "export"],
      },
      {
        key: "leadForms",
        label: "Lead Form",
        actions: ["create", "edit", "delete", "view"],
      },
    ],
  },
  {
    title: "CONTACTS",
    modules: [
      {
        key: "contacts",
        label: "Contacts",
        actions: ["create", "view", "import"],
      },
    ],
  },
  {
    title: "CHATBOTS",
    modules: [
      {
        key: "chatbots",
        label: "Chatbots",
        actions: ["create", "edit", "delete", "view"],
      },
    ],
  },
  {
    title: "CHANNELS",
    modules: [
      {
        key: "whatsapp",
        label: "WhatsApp (settings & templates)",
        description:
          "Connect WABA, manage templates, opt-in, canned replies, AI agent. Does not include marketing broadcasts.",
        actions: ["view", "create", "edit", "delete"],
      },
      {
        key: "liveChat",
        label: "Live Chat",
        description: "Inbox: view conversations and intervene/reply.",
        actions: ["view", "edit"],
      },
      {
        key: "facebook",
        label: "Facebook",
        description: "Connect Facebook Page / Meta ads & lead forms.",
        actions: ["view", "edit"],
      },
      {
        key: "instagram",
        label: "Instagram",
        description: "Connect Instagram via Meta.",
        actions: ["view", "edit"],
      },
      {
        key: "telegram",
        label: "Telegram",
        description: "Connect and manage Telegram channel.",
        actions: ["view", "edit"],
      },
    ],
  },
  {
    title: "MARKETING",
    modules: [
      {
        key: "whatsappMarketing",
        label: "WhatsApp Marketing",
        description:
          "Broadcast campaigns. Independent of WhatsApp channel access.",
        actions: ["view", "create", "edit", "delete", "send"],
      },
      {
        key: "emailMarketing",
        label: "Email Marketing",
        description: "Email campaigns, templates, audiences, send.",
        actions: ["view", "create", "edit", "delete", "send"],
      },
    ],
  },
  {
    title: "WORKSPACE SETTINGS",
    modules: [
      {
        key: "organization",
        label: "Company details",
        actions: ["view", "edit"],
      },
      {
        key: "configuration",
        label: "Configuration",
        actions: ["view", "edit"],
      },
      {
        key: "activityLogs",
        label: "Activity Logs",
        actions: ["view"],
      },
      {
        key: "integrations",
        label: "Integrations / Apps",
        actions: ["view", "edit"],
      },
      {
        key: "webhooks",
        label: "Webhooks",
        description: "Developer webhook tokens and inbound leads.",
        actions: ["view", "edit"],
      },
      {
        key: "recycleBin",
        label: "Recycle Bin",
        actions: ["view", "edit"],
      },
      {
        key: "storage",
        label: "Storage",
        actions: ["view"],
      },
    ],
  },
];

/** Flat list of every permission key derived from the catalog. */
export const PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap((section) =>
  section.modules.flatMap((mod) =>
    mod.actions.map((action) => `${mod.key}.${action}`),
  ),
);

/**
 * ACCOUNT_MANAGER gets everything except these (org-risk / billing-ish).
 * Marketing send is allowed; account/team create-delete stays restricted.
 */
export const NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER = [
  "accounts.create",
  "accounts.delete",
  "teams.create",
  "teams.delete",
  "role.create",
  "role.edit",
  "role.delete",
  "whatsappMarketing.delete",
  "emailMarketing.delete",
  "organization.edit",
  "webhooks.edit",
  "recycleBin.edit",
];

export function getPermissionCatalog() {
  return {
    sections: PERMISSION_CATALOG,
    keys: PERMISSIONS,
  };
}
