export class AutomationDto {
  name: string;
  trigger: string;
  conditions: any[];
  actions: any[];
  status: "published" | "draft";

  constructor(data: AutomationDto) {
    const ALLOWED_FIELDS = [
      "name",
      "trigger",
      "conditions",
      "actions",
      "status",
      "isActive",
    ];

    const unknownFields = Object.keys(data).filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );

    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    this.name = data.name;
    this.trigger = data.trigger;
    this.conditions = data.conditions;
    this.actions = data.actions;
    this.status = data.status;

    if (!data.name) throw new Error("Automation name is required");
    if (!data.trigger) throw new Error("Automation trigger is required");
    if (!Array.isArray(data.conditions))
      throw new Error("Automation conditions must be an array");
    if (!data.conditions.length)
      throw new Error("Automation conditions is required");
    if (!data.actions?.length)
      throw new Error("Automation actions is required");
    if (!data.status) throw new Error("Automation status is required");
  }
}

export class updateAutomationDto {
  name?: string;
  trigger?: string;
  conditions?: any[];
  actions?: any[];
  status?: "published" | "draft";
  isActive?: boolean;

  constructor(data: updateAutomationDto) {
    const ALLOWED_FIELDS = [
      "name",
      "trigger",
      "conditions",
      "actions",
      "status",
      "isActive",
    ];

    const unknownFields = Object.keys(data).filter(
      (key) => !ALLOWED_FIELDS.includes(key),
    );

    if (unknownFields.length) {
      throw new Error(`Unknown fields: ${unknownFields.join(", ")}`);
    }

    if (data?.conditions) {
      if (!Array.isArray(data.conditions))
        throw new Error("Automation conditions must be an array");
    }

    if (data?.actions) {
      if (!Array.isArray(data.actions))
        throw new Error("Automation actions must be an array");
    }

    if (data.isActive) {
      if (typeof data.isActive !== "boolean") {
        throw new Error("isActive must be boolean");
      }
    }

    this.name = data.name;
    this.trigger = data.trigger;
    this.conditions = data.conditions;
    this.actions = data.actions;
    this.status = data.status;
    this.isActive = data.isActive;
  }
}
