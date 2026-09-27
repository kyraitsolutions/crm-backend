import { USAGE_METRIC } from "../../../../constants/subscription.constant.js";
import { SubscriptionService } from "../../../../services/subscription.service.js";
import { HttpError } from "../../../../utils/http.error.js";
import { IMPORT_ERROR_CODE } from "../constants/import.constant.js";
import type { ContactImportJobRecord } from "../types/import.types.js";
import type { ImportQuotaPort } from "./quota-port.js";

export type { ImportQuotaPort } from "./quota-port.js";
export { MemoryImportQuota } from "./quota-port.js";

export class SubscriptionImportQuota implements ImportQuotaPort {
  constructor(private readonly subscription = new SubscriptionService()) {}

  async assertCanInsert(organizationId: string, plannedRows: number): Promise<void> {
    try {
      await this.subscription.checkLimit(organizationId, USAGE_METRIC.CONTACTS, plannedRows);
    } catch (error) {
      if (error instanceof HttpError && (error.statusCode === 402 || error.statusCode === 403)) {
        throw HttpError.tooManyRequests(
          error.message,
          error.details,
          IMPORT_ERROR_CODE.IMPORT_RATE_LIMITED,
        );
      }
      throw error;
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
    await this.subscription.recordUsage(organizationId, USAGE_METRIC.CONTACTS, inserted);
  }
}
