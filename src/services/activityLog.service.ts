import { FilterQuery } from "mongoose";
import { ActivityLogRepository } from "../repositories/activityLog.repository.js";
import { TActivityLog } from "../types/activityLog.type.js";
import { TActivityLogQuery } from "../types/api-response.type.js";
import { getObjectChanges } from "../utils/getObjectChanges.utils.js";
import { buildPagination } from "../utils/paginationBuilder.js";
import logger from "../utils/logger.js";

export class ActivityLogService {
  private repository = new ActivityLogRepository();

  userActor(user?: { id?: string; name?: string; userName?: string }) {
    if (user?.id) {
      return {
        type: "user" as const,
        id: user.id,
        name: user.name || user.userName || "",
      };
    }
    return { type: "system" as const, name: "system" };
  }

  async getActivityLogs(
    accountId: string,
    organizationId: string,
    query: TActivityLogQuery,
  ) {
    const { page = 1, limit = 50, filters } = query;

    const mongoFilter: FilterQuery<TActivityLog> = {
      $or: [{ accountId }, { organizationId }],
    };

    if (filters?.entityType) {
      mongoFilter.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      mongoFilter.entityId = filters.entityId;
    }

    if (filters?.action) {
      mongoFilter.action = filters.action;
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.repository.find(mongoFilter, {
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.repository.count(mongoFilter),
    ]);

    return {
      docs: logs,
      pagination: buildPagination({
        page,
        limit,
        totalDocs: total,
        docsCount: logs.length,
      }),
    };
  }

  async create(payload: Partial<TActivityLog>) {
    try {
      if (!payload.organizationId || !payload.entityType || !payload.entityId) {
        return null;
      }
      return await this.repository.create({
        ...payload,
        actor: payload.actor || { type: "system", name: "system" },
      });
    } catch (error) {
      logger.error("Failed to write activity log", {
        entityType: payload.entityType,
        action: payload.action,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async log(payload: Partial<TActivityLog>) {
    return this.create(payload);
  }

  async logCreate({
    entityType,
    entityId,
    actor,
    metadata,
    accountId,
    organizationId,
  }: Partial<TActivityLog>) {
    return this.create({
      accountId,
      organizationId,
      entityType,
      entityId,
      action: `${entityType}.created`,
      actor,
      metadata,
    });
  }

  async logUpdate({
    oldDoc,
    newDoc,
    entityType,
    entityId,
    actor,
    metadata,
    accountId,
    organizationId,
  }: Partial<TActivityLog & { oldDoc: any; newDoc: any }>) {
    const changes = getObjectChanges(oldDoc, newDoc);

    if (Object.keys(changes).length === 0) {
      return;
    }

    return this.create({
      accountId,
      organizationId,
      entityType,
      entityId,
      action: `${entityType}.updated`,
      actor,
      changes,
      metadata,
    });
  }

  async logDelete({
    entityType,
    entityId,
    actor,
    metadata,
    accountId,
    organizationId,
    deletedData,
  }: Partial<TActivityLog & { deletedData: any }>) {
    return this.create({
      accountId,
      organizationId,
      entityType,
      entityId,
      action: `${entityType}.deleted`,
      actor,
      metadata: {
        ...metadata,
        deletedData,
      },
    });
  }
}
