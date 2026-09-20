import { parseStartImportRequest } from "../dtos/import.dto.js";
import { defaultRuntimeSettings, type ImportRuntimeSettings } from "../config/import-env.js";
import { MemoryQueue } from "../queue/memory-queue.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import { registerImportProcessors } from "../runtime/register-processors.js";
import type { ImportOrchestrationDeps } from "../runtime/deps.js";
import type { FileStore } from "../store/file-store.js";
import type { ImportWorkspaceId, StartImportRequest } from "../types/import.types.js";
import { handleValidatePlan } from "../handlers/validate-plan.handler.js";
import { startImport } from "../services/import-lifecycle.service.js";

export const defaultStart: StartImportRequest = parseStartImportRequest({
  mapping: [
    { source: "name", target: "name" },
    { source: "phone", target: "phone" },
    { source: "email", target: "email" },
  ],
  defaultCountry: "IN",
});

export function wireRuntime(
  repository: ContactImportRepository,
  store: FileStore,
  settings: Partial<ImportRuntimeSettings> = {},
): { deps: ImportOrchestrationDeps; queue: MemoryQueue } {
  const queue = new MemoryQueue();
  const deps: ImportOrchestrationDeps = {
    repository,
    store,
    queue,
    settings: defaultRuntimeSettings(settings),
  };
  registerImportProcessors(deps, 1);
  return { deps, queue };
}

export async function planAndStart(
  deps: ImportOrchestrationDeps,
  workspaceId: ImportWorkspaceId,
  jobId: string,
  start: StartImportRequest = defaultStart,
): Promise<void> {
  await handleValidatePlan(deps, workspaceId, jobId);
  const result = await startImport(deps, workspaceId, jobId, start);
  if (!result.ok) {
    throw new Error(`startImport failed: ${result.reason}`);
  }
}

export function buildContactCsv(
  rows: number,
  options: { failEvery?: number; offset?: number } = {},
): { csv: string; failedRowNumbers: number[] } {
  const failEvery = options.failEvery ?? 0;
  const offset = options.offset ?? 0;
  const failedRowNumbers: number[] = [];
  const lines = ["name,phone,email"];
  for (let index = 0; index < rows; index += 1) {
    const rowNumber = index + 1;
    const id = offset + index;
    if (failEvery > 0 && rowNumber % failEvery === 0) {
      lines.push(`Bad${id},not-a-phone,bad${id}@kyra.test`);
      failedRowNumbers.push(rowNumber);
    } else {
      const national = 9876500000 + id;
      lines.push(`N${id},+91${national},u${id}@kyra.test`);
    }
  }
  return { csv: `${lines.join("\n")}\n`, failedRowNumbers };
}
