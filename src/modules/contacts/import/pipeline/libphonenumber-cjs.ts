import { createRequire } from "node:module";

/**
 * Jest's ESM transformer treats libphonenumber-js's CJS default export (a
 * function) as the module namespace. A static `import { parsePhoneNumberFromString }`
 * then feeds metadata into the default-country argument and every number fails.
 * `createRequire` loads the CJS build the same way Node does at runtime.
 * Keep the workaround in this one wrapper; do not scatter createRequire calls.
 */
const require = createRequire(import.meta.url);

interface ParsedPhone {
  isValid(): boolean;
  isPossible(): boolean;
  format(style: "E.164"): string;
}

export interface LibPhoneNumberApi {
  parsePhoneNumberFromString(
    input: string,
    defaultCountry?: string,
  ): ParsedPhone | undefined;
}

export function loadLibPhoneNumber(): LibPhoneNumberApi {
  const loaded: unknown = require("libphonenumber-js");
  if ((typeof loaded !== "object" && typeof loaded !== "function") || loaded === null) {
    throw new Error("libphonenumber-js did not export an object");
  }
  if (!("parsePhoneNumberFromString" in loaded)) {
    throw new Error("libphonenumber-js is missing parsePhoneNumberFromString");
  }
  const parse = loaded.parsePhoneNumberFromString;
  if (typeof parse !== "function") {
    throw new Error("libphonenumber-js parsePhoneNumberFromString is not a function");
  }
  return {
    parsePhoneNumberFromString: (
      input: string,
      defaultCountry?: string,
    ): ParsedPhone | undefined => {
      const parsed: unknown = parse(input, defaultCountry);
      if (typeof parsed !== "object" || parsed === null) {
        return undefined;
      }
      if (!("isValid" in parsed) || !("format" in parsed)) {
        return undefined;
      }
      if (typeof parsed.isValid !== "function" || typeof parsed.format !== "function") {
        return undefined;
      }
      const isValid = parsed.isValid.bind(parsed);
      const isPossible =
        "isPossible" in parsed && typeof parsed.isPossible === "function"
          ? parsed.isPossible.bind(parsed)
          : isValid;
      const format = parsed.format.bind(parsed);
      return {
        isValid: () => Boolean(isValid()),
        isPossible: () => Boolean(isPossible()),
        format: (style: "E.164") => String(format(style)),
      };
    },
  };
}
