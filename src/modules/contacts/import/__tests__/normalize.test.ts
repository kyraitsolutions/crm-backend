import { normalizePhoneValue } from "../pipeline/normalize.js";

describe("normalizePhoneValue", () => {
  it("rejects a too-short +prefixed number that looks like E.164", () => {
    expect(normalizePhoneValue("+1234567")).toBeUndefined();
  });

  it("parses a spaced Indian mobile into E.164", () => {
    expect(normalizePhoneValue("+91 98765 43210")).toBe("+919876543210");
  });

  it("accepts a possible Indian mobile that is not in an assigned range", () => {
    expect(normalizePhoneValue("+9190000000001", "IN")).toBe("+9190000000001");
    expect(normalizePhoneValue("90000000001", "IN")).toBe("+9190000000001");
  });
});
