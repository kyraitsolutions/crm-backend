export const generateSlug = (str: string) =>
  str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

// export const normalizeTrigger = (trigger: string) =>
// trigger
//   ?.trim()
//   .replace(/[-\s]+/g, "_")
//   .toUpperCase();
