export enum TemplateStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PAUSED = "PAUSED",
  DISABLED = "DISABLED",
  DELETED = "DELETED",
}

export enum TemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}

export enum TemplateParameterFormat {
  POSITIONAL = "POSITIONAL",
  NAMED = "NAMED",
}

export enum TemplateComponentType {
  HEADER = "HEADER",
  BODY = "BODY",
  FOOTER = "FOOTER",
  BUTTONS = "BUTTONS",
}

export enum HeaderFormat {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  LOCATION = "LOCATION",
}

export enum ButtonType {
  QUICK_REPLY = "QUICK_REPLY",
  URL = "URL",
  PHONE_NUMBER = "PHONE_NUMBER",
  COPY_CODE = "COPY_CODE",
  OTP = "OTP",
}

export enum VariableSourceType {
  CONTACT = "CONTACT",
  LEAD = "LEAD",
  BOOKING = "BOOKING",
  CUSTOM = "CUSTOM",
  STATIC = "STATIC",
  API = "API",
}
