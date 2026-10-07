import {
  AUTOMATION_ACTION_VALUES,
  AUTOMATION_ACTIONS,
  AUTOMATION_STATUSES,
  AUTOMATION_TRIGGER_VALUES,
  CONDITION_FIELD_LABELS,
  CONDITION_OPERATOR_VALUES,
} from "../constants/automation.constant.js";

function normalizeTrigger(trigger: string): string {
  return String(trigger || "")
    .trim()
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

function validateConditions(conditions: unknown) {
  if (!Array.isArray(conditions)) {
    throw new Error("Automation conditions must be an array");
  }

  for (const [index, condition] of conditions.entries()) {
    if (!condition || typeof condition !== "object") {
      throw new Error(`Condition ${index + 1} is invalid`);
    }
    const field = String((condition as any).field || "").trim();
    const operator = String((condition as any).operator || "").trim();
    const values = (condition as any).values;

    if (!field) throw new Error(`Condition ${index + 1}: field is required`);
    if (!CONDITION_FIELD_LABELS.includes(field)) {
      throw new Error(`Condition ${index + 1}: unsupported field "${field}"`);
    }
    if (!CONDITION_OPERATOR_VALUES.includes(operator as any)) {
      throw new Error(`Condition ${index + 1}: unsupported operator "${operator}"`);
    }
    if (
      !["is_empty", "is_not_empty"].includes(operator) &&
      (!Array.isArray(values) || values.length === 0)
    ) {
      throw new Error(`Condition ${index + 1}: values are required`);
    }
  }
}

function validateActions(actions: unknown) {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error("Automation actions is required");
  }

  for (const [index, action] of actions.entries()) {
    if (!action || typeof action !== "object") {
      throw new Error(`Action ${index + 1} is invalid`);
    }
    const type = String((action as any).type || "").trim();
    const config = (action as any).config || {};

    if (!AUTOMATION_ACTION_VALUES.includes(type as any)) {
      throw new Error(`Action ${index + 1}: unsupported type "${type}"`);
    }

    if (type === AUTOMATION_ACTIONS.ASSIGN_LEAD_TO_USER) {
      if (!config.user && !config.assignedTo) {
        throw new Error(`Action ${index + 1}: assign user is required`);
      }
    }

    if (type === AUTOMATION_ACTIONS.CREATE_TASK) {
      if (!String(config.title || "").trim()) {
        throw new Error(`Action ${index + 1}: task title is required`);
      }
    }

    if (type === AUTOMATION_ACTIONS.SEND_NOTIFICATION) {
      if (!String(config.target || "").trim() && !config.user) {
        throw new Error(`Action ${index + 1}: notification target is required`);
      }
    }

    if (type === AUTOMATION_ACTIONS.UPDATE_LEAD_STAGE) {
      if (!String(config.stage || "").trim()) {
        throw new Error(`Action ${index + 1}: stage is required`);
      }
    }

    if (type === AUTOMATION_ACTIONS.ADD_LEAD_TAG) {
      if (!String(config.tag || "").trim()) {
        throw new Error(`Action ${index + 1}: tag is required`);
      }
    }
  }
}

export class AutomationDto {
  name: string;
  trigger: string;
  conditions: any[];
  actions: any[];
  status: "published" | "draft";
  isActive?: boolean;

  constructor(data: Record<string, any>) {
    const ALLOWED_FIELDS = [
      "name",
      "trigger",
      "conditions",
      "actions",
      "status",
      "isActive",
    ];

    const unknownFields = Object.keys(data || {}).filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );
    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    if (!data?.name || !String(data.name).trim()) {
      throw new Error("Automation name is required");
    }
    if (!data?.trigger) {
      throw new Error("Automation trigger is required");
    }

    const trigger = normalizeTrigger(data.trigger);
    if (!AUTOMATION_TRIGGER_VALUES.includes(trigger as any)) {
      throw new Error(`Unsupported trigger "${data.trigger}"`);
    }

    if (!AUTOMATION_STATUSES.includes(data.status)) {
      throw new Error("Automation status must be draft or published");
    }

    validateConditions(data.conditions ?? []);
    validateActions(data.actions);

    if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
      throw new Error("isActive must be boolean");
    }

    this.name = String(data.name).trim();
    this.trigger = trigger;
    this.conditions = Array.isArray(data.conditions) ? data.conditions : [];
    this.actions = data.actions;
    this.status = data.status;
    this.isActive = data.isActive;
  }
}

export class updateAutomationDto {
  name?: string;
  trigger?: string;
  conditions?: any[];
  actions?: any[];
  status?: "published" | "draft";
  isActive?: boolean;

  constructor(data: Record<string, any>) {
    const ALLOWED_FIELDS = [
      "name",
      "trigger",
      "conditions",
      "actions",
      "status",
      "isActive",
    ];

    const unknownFields = Object.keys(data || {}).filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );
    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    if (data.name !== undefined) {
      if (!String(data.name).trim()) {
        throw new Error("Automation name is required");
      }
      this.name = String(data.name).trim();
    }

    if (data.trigger !== undefined) {
      const trigger = normalizeTrigger(data.trigger);
      if (!AUTOMATION_TRIGGER_VALUES.includes(trigger as any)) {
        throw new Error(`Unsupported trigger "${data.trigger}"`);
      }
      this.trigger = trigger;
    }

    if (data.conditions !== undefined) {
      validateConditions(data.conditions);
      this.conditions = data.conditions;
    }

    if (data.actions !== undefined) {
      validateActions(data.actions);
      this.actions = data.actions;
    }

    if (data.status !== undefined) {
      if (!AUTOMATION_STATUSES.includes(data.status)) {
        throw new Error("Automation status must be draft or published");
      }
      this.status = data.status;
    }

    if (data.isActive !== undefined) {
      if (typeof data.isActive !== "boolean") {
        throw new Error("isActive must be boolean");
      }
      this.isActive = data.isActive;
    }
  }
}
