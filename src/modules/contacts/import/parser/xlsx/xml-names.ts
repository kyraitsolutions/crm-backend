export function localName(name: string): string {
  const braced = name.lastIndexOf("}");
  if (braced >= 0) {
    return name.slice(braced + 1);
  }
  const colon = name.lastIndexOf(":");
  if (colon >= 0) {
    return name.slice(colon + 1);
  }
  return name;
}

export function attributeValue(
  attributes: Record<string, string | object>,
  local: string,
): string | undefined {
  const direct = attributes[local];
  if (typeof direct === "string") {
    return direct;
  }
  for (const [key, value] of Object.entries(attributes)) {
    if (localName(key) === local && typeof value === "string") {
      return value;
    }
  }
  return undefined;
}
