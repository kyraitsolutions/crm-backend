import type { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type {
  ContactImportJobRecord,
  ImportWorkspaceId,
  StartImportRequest,
  TransitionResult,
} from "../types/import.types.js";

export function persistStartConfig(
  repository: ContactImportRepository,
  workspaceId: ImportWorkspaceId,
  jobId: string,
  start: StartImportRequest,
): Promise<TransitionResult<ContactImportJobRecord>> {
  return repository.transition(workspaceId, jobId, "mapping", "queued", {
    mapping: start.mapping,
    policy: start.policy,
    identity: start.identity,
    merge: start.merge,
    defaultCountry: start.defaultCountry,
  });
}
