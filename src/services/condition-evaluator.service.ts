import { CONDITION_OPERATORS } from "../constants";

export default class ConditionEvaluator {
  evaluate(conditions: any[], payload: any) {
    for (const condition of conditions) {
      const value = payload[this.mapField(condition.field)];

      if (condition.operator === CONDITION_OPERATORS.EQUALS) {
        if (condition.values.includes(value)) {
          return false;
        }
      }
    }

    return true;
  }
  private mapField(field: string) {
    const map: Record<string, string> = {
      "Lead Status": "stage",
      "Lead Source": "source.name",
      "Assigned User": "assignedUser",
    };

    return map[field];
  }
}
