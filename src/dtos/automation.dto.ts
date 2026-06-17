export class AutomationDto {
  name: string;
  trigger: string;
  conditions: any[];
  actions: any[];

  constructor(data: AutomationDto) {
    this.name = data.name;
    this.trigger = data.trigger;
    this.conditions = data.conditions;
    this.actions = data.actions;

    if (!data.name) throw new Error("Automation name is required");
    if (!data.trigger) throw new Error("Automation trigger is required");
    if (!data.conditions.length)
      throw new Error("Automation conditions is required");
    if (!data.actions?.length)
      throw new Error("Automation actions is required");
  }
}
