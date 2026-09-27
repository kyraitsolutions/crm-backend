import type { ImportStatus } from "../types/import.types.js";
import { IMPORT_STATUS } from "../constants/import.constant.js";

export interface DispatchSnapshot {
  jobStatus: ImportStatus;
  cancelRequested: boolean;
  pauseRequested: boolean;
  pendingIndexes: number[];
  processingCount: number;
  dispatchK: number;
}

export type DispatchAction =
  | { type: "enqueue_chunk"; index: number }
  | { type: "enqueue_finalize" };

export function computeDispatchActions(state: DispatchSnapshot): DispatchAction[] {
  if (
    state.jobStatus === IMPORT_STATUS.CANCELLED ||
    state.jobStatus === IMPORT_STATUS.FAILED ||
    state.jobStatus === IMPORT_STATUS.COMPLETED ||
    state.jobStatus === IMPORT_STATUS.COMPLETED_WITH_ERRORS ||
    state.cancelRequested
  ) {
    return [];
  }
  if (state.jobStatus === IMPORT_STATUS.PAUSED || state.pauseRequested) {
    return [];
  }
  if (state.jobStatus !== IMPORT_STATUS.PROCESSING) {
    return [];
  }
  if (state.processingCount === 0 && state.pendingIndexes.length === 0) {
    return [{ type: "enqueue_finalize" }];
  }
  const slots = Math.max(0, state.dispatchK - state.processingCount);
  return state.pendingIndexes.slice(0, slots).map((index) => ({
    type: "enqueue_chunk",
    index,
  }));
}
