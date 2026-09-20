import { IMPORT_ALLOWED_TRANSITIONS, IMPORT_STATUS } from "../constants/import.constant.js";
import { canTransition } from "../state/import-state-machine.js";
import type { ImportStatus } from "../types/import.types.js";

const ALL_STATUSES = Object.values(IMPORT_STATUS);

describe("canTransition", () => {
  it("allows every legal edge from the transition map", () => {
    for (const from of ALL_STATUSES) {
      for (const to of IMPORT_ALLOWED_TRANSITIONS[from]) {
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });

  it("rejects every pair that is not in the map", () => {
    const cases: Array<[ImportStatus, ImportStatus]> = [];
    for (const from of ALL_STATUSES) {
      const allowed = new Set<string>(IMPORT_ALLOWED_TRANSITIONS[from]);
      for (const to of ALL_STATUSES) {
        if (!allowed.has(to)) {
          cases.push([from, to]);
        }
      }
    }
    expect(cases.length).toBeGreaterThan(0);
    for (const [from, to] of cases) {
      expect(canTransition(from, to)).toBe(false);
    }
  });

  it("does not allow restart from a terminal status", () => {
    expect(canTransition("completed", "queued")).toBe(false);
    expect(canTransition("completed_with_errors", "processing")).toBe(false);
    expect(canTransition("failed", "uploaded")).toBe(false);
    expect(canTransition("cancelled", "mapping")).toBe(false);
  });
});
