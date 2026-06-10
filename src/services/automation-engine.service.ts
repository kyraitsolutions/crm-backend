import AutomationRepository from "../repositories/automation.repository";
import ActionExecutor from "./action-executor.service";
import ConditionEvaluator from "./condition-evaluator.service";

export class AutomationEngine {
  private repository = new AutomationRepository();
  private conditionEvaluator = new ConditionEvaluator();
  private actionExecutor = new ActionExecutor();

  async process(event: any) {
    const automations = await this.repository.findByTrigger(
      event.accountId,
      event.trigger,
    );

    for (const automation of automations) {
      const matched = this.conditionEvaluator.evaluate(
        automation.conditions,
        event.payload,
      );

      if (!matched) {
        continue;
      }

      const eventDataPayload = {
        ...event.payload,
        automationId: automation._id,
        automationName: automation.name,
      };

      await this.actionExecutor.execute(automation.actions, eventDataPayload);
    }
  }
}
