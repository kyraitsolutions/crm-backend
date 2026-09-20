import { IMPORT_ALLOWED_TRANSITIONS } from "../constants/import.constant.js";
import type { ImportStatus } from "../types/import.types.js";

export function canTransition(from: ImportStatus, to: ImportStatus): boolean {
  return IMPORT_ALLOWED_TRANSITIONS[from].includes(to);
}
