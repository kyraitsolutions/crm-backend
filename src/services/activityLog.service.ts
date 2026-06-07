import { ActivityLogRepository } from "../repositories/activityLog.repository";

export class ActivityLogService {
  private repository = new ActivityLogRepository();

  async log({
    accountId,
    organizationId,
    entityType,
    entityId,
    action,
    actor,
    changes = {},
    metadata = {},
  }: any) {
    return this.repository.create({
      accountId,
      organizationId,
      entityType,
      entityId,
      action,
      actor,
      changes,
      metadata,
    });
  }
}
