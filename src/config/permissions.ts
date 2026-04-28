export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  ACCOUNT_MANAGER: "ACCOUNT_MANAGER",
};
export const DEFAULT_ROLES = ["ADMIN", "ACCOUNT_MANAGER"];

export const PERMISSIONS = [
  // Roles
  "role.view",
  // Accounts
  "accounts.create",
  "accounts.edit",
  "accounts.delete",
  "accounts.view",
  "accounts.export",

  // Chatbots
  "chatbots.create",
  "chatbots.edit",
  "chatbots.delete",
  "chatbots.view",

  // Leads
  "leads.create",
  "leads.edit",
  "leads.delete",
  "leads.view",
  "leads.export",

  // Lead Forms
  "leadForms.create",
  "leadForms.edit",
  "leadForms.delete",
  "leadForms.view",

  // teams
  "teams.create",
  "teams.edit",
  "teams.delete",
  "teams.view",

  // Campaigns
  "campaigns.create",
  "campaigns.edit",
  "campaigns.delete",
  "campaigns.view",
];

export const NOT_ALLOWED_PERMISSIONS_ACCOUNT_MANGER = [
  "accounts.create",
  "accounts.delete",
  "teams.create",
  "teams.delete",
  "campaigns.delete",
];
