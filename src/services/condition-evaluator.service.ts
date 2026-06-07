export default class ConditionEvaluator {
  evaluate(conditions: any[], payload: any) {
    for (const condition of conditions) {
      const value = payload[this.mapField(condition.field)];

      if (condition.operator === "Is Equal To") {
        if (value !== condition.value) {
          return false;
        }
      }
    }

    return true;
  }
  private mapField(field: string) {
    const map: Record<string, string> = {
      "Lead Status": "stage",
      "Lead Source": "source",
      "Assigned User": "assignedUser",
    };

    return map[field];
  }
}
