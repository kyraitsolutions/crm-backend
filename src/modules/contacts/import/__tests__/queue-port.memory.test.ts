import { MemoryQueue } from "../queue/memory-queue.js";
import { defineQueuePortContract } from "./queue-port.contract.js";

defineQueuePortContract("MemoryQueue", async () => {
  const queue = new MemoryQueue(5);
  return {
    queue,
    drain: () => queue.drain(),
    killActive: () => {
      queue.killActive();
    },
    cleanup: async () => {
      await queue.close();
    },
  };
});
