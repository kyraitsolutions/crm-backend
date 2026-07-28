// template.enums.ts

export const TemplateStatus = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PAUSED: "PAUSED",
  DISABLED: "DISABLED",
  DELETED: "DELETED",
} as const;

export const TemplateCategory = {
  MARKETING: "MARKETING",
  UTILITY: "UTILITY",
  AUTHENTICATION: "AUTHENTICATION",
} as const;

export const TemplateParameterFormat = {
  POSITIONAL: "POSITIONAL",
  NAMED: "NAMED",
} as const;

export const TemplateComponentType = {
  HEADER: "HEADER",
  BODY: "BODY",
  FOOTER: "FOOTER",
  BUTTONS: "BUTTONS",
} as const;

export const HeaderFormat = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  DOCUMENT: "DOCUMENT",
  LOCATION: "LOCATION",
} as const;

export const ButtonType = {
  QUICK_REPLY: "QUICK_REPLY",
  URL: "URL",
  PHONE_NUMBER: "PHONE_NUMBER",
  COPY_CODE: "COPY_CODE",
  OTP: "OTP",
} as const;

export const VariableSourceType = {
  CONTACT: "CONTACT",
  LEAD: "LEAD",
  BOOKING: "BOOKING",
  CUSTOM: "CUSTOM",
  STATIC: "STATIC",
  API: "API",
} as const;

// export types

export type HeaderFormat = (typeof HeaderFormat)[keyof typeof HeaderFormat];

export type ButtonType = (typeof ButtonType)[keyof typeof ButtonType];

export type TemplateParameterFormat =
  (typeof TemplateParameterFormat)[keyof typeof TemplateParameterFormat];

export type TemplateComponentType =
  (typeof TemplateComponentType)[keyof typeof TemplateComponentType];

export type TemplateStatus =
  (typeof TemplateStatus)[keyof typeof TemplateStatus];

export type TemplateCategory =
  (typeof TemplateCategory)[keyof typeof TemplateCategory];

export type VariableSourceType =
  (typeof VariableSourceType)[keyof typeof VariableSourceType];
