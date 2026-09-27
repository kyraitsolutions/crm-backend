import type { ImportRuntimeSettings } from "../config/import-env.js";
import type { ImportQuotaPort } from "../http/quota-port.js";
import type { QueuePort } from "../queue/queue-port.js";
import type { ContactImportRepository } from "../repositories/contact-import.repository.js";
import type { FileStore } from "../store/file-store.js";

export interface ImportOrchestrationDeps {
  repository: ContactImportRepository;
  store: FileStore;
  queue: QueuePort;
  settings: ImportRuntimeSettings;
  quota?: ImportQuotaPort;
  onHeartbeat?: () => Promise<void> | void;
}
