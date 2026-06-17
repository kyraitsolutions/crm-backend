export function getObjectChanges(
  oldDoc: Record<string, any>,
  newDoc: Record<string, any>,
) {
  const changes: Record<string, any> = {};

  Object.keys(newDoc).forEach((key) => {
    const oldValue = oldDoc[key];
    const newValue = newDoc[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        from: oldValue,
        to: newValue,
      };
    }
  });

  return changes;
}
