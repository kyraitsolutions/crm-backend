import { HttpError } from "../../../../utils/http.error.js";
import { IMPORT_ERROR_CODE } from "../constants/import.constant.js";
import type { ContactImportJobRecord } from "../types/import.types.js";

export interface ImportQuotaPort {
  assertCanInsert(organizationId: string, plannedRows: number): Promise<void>;
  settleInserted(organizationId: string, job: ContactImportJobRecord, inserted: number): Promise<void>;
}

export class MemoryImportQuota implements ImportQuotaPort {
  remaining = Number.POSITIVE_INFINITY;
  settled: Array<{ organizationId: string; jobId: string; inserted: number }> = [];

  async assertCanInsert(_organizationId: string, plannedRows: number): Promise<void> {
    if (Number.isFinite(this.remaining) && plannedRows > this.remaining) {
      throw HttpError.tooManyRequests(
        `Import would exceed remaining contact capacity (${this.remaining} remaining)`,
        { remaining: this.remaining, plannedRows },
        IMPORT_ERROR_CODE.IMPORT_RATE_LIMITED,
      );
    }
  }

  async settleInserted(
    organizationId: string,
    job: ContactImportJobRecord,
    inserted: number,
  ): Promise<void> {
    if (inserted <= 0) {
      return;
    }
    this.settled.push({ organizationId, jobId: job.id, inserted });
  }
}
