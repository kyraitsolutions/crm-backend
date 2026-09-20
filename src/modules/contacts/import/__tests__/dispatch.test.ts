import { computeDispatchActions } from "../dispatch/compute-dispatch-actions.js";

describe("computeDispatchActions", () => {
  it("enqueues up to K pending chunks", () => {
    const actions = computeDispatchActions({
      jobStatus: "processing",
      cancelRequested: false,
      pauseRequested: false,
      pendingIndexes: [0, 1, 2, 3],
      processingCount: 1,
      dispatchK: 3,
    });
    expect(actions).toEqual([
      { type: "enqueue_chunk", index: 0 },
      { type: "enqueue_chunk", index: 1 },
    ]);
  });

  it("enqueues finalize when nothing is pending or processing", () => {
    expect(
      computeDispatchActions({
        jobStatus: "processing",
        cancelRequested: false,
        pauseRequested: false,
        pendingIndexes: [],
        processingCount: 0,
        dispatchK: 3,
      }),
    ).toEqual([{ type: "enqueue_finalize" }]);
  });

  it("does not dispatch when paused or cancelled", () => {
    expect(
      computeDispatchActions({
        jobStatus: "processing",
        cancelRequested: false,
        pauseRequested: true,
        pendingIndexes: [0],
        processingCount: 0,
        dispatchK: 3,
      }),
    ).toEqual([]);
    expect(
      computeDispatchActions({
        jobStatus: "cancelled",
        cancelRequested: true,
        pauseRequested: false,
        pendingIndexes: [0],
        processingCount: 0,
        dispatchK: 3,
      }),
    ).toEqual([]);
  });
});
