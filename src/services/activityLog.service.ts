import { FilterQuery } from "mongoose";
import { ActivityLogRepository } from "../repositories/activityLog.repository.js";
import { TActivityLog } from "../types/activityLog.type.js";
import { TActivityLogQuery } from "../types/api-response.type.js";
import { enrichActivityChanges } from "../utils/enrich-activity-changes.utils.js";
import { getObjectChanges } from "../utils/getObjectChanges.utils.js";
import { buildPagination } from "../utils/paginationBuilder.js";
import logger from "../utils/logger.js";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDate = (value: string | undefined, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay && !value.includes("T")) date.setHours(23, 59, 59, 999);
  return date;
};

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
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const filters = query.filters;

    const clauses: FilterQuery<TActivityLog>[] = [
      { $or: [{ accountId }, { organizationId }] },
    ];

    if (filters?.entityType) clauses.push({ entityType: filters.entityType });
    if (filters?.entityId) clauses.push({ entityId: filters.entityId });
    if (filters?.action) clauses.push({ action: new RegExp(`${escapeRegex(filters.action)}$`, "i") });
    if (filters?.actorType) clauses.push({ "actor.type": filters.actorType });

    const start = parseDate(filters?.startDate);
    const end = parseDate(filters?.endDate, true);
    if (start || end) {
      clauses.push({
        createdAt: {
          ...(start ? { $gte: start } : {}),
          ...(end ? { $lte: end } : {}),
        },
      });
    }

    const term = query.search?.trim();
    if (term) {
      const pattern = new RegExp(escapeRegex(term), "i");
      clauses.push({
        $or: [
          { action: pattern },
          { entityType: pattern },
          { "actor.name": pattern },
          { "metadata.name": pattern },
          { "metadata.email": pattern },
          { "metadata.phone": pattern },
          { "metadata.leadName": pattern },
          { "metadata.provider": pattern },
          { "metadata.title": pattern },
          { "metadata.automationName": pattern },
          { "metadata.roleName": pattern },
          { "metadata.accountName": pattern },
          { "metadata.campaignName": pattern },
        ],
      });
    }

    const mongoFilter: FilterQuery<TActivityLog> = { $and: clauses };

    const skip = (page - 1) * limit; 

    const [logs, total] = await Promise.all([
      this.repository.find(mongoFilter, {
        skip,
        limit,
        sort: { createdAt: -1 },
      }),
      this.repository.count(mongoFilter),
    ]);

    // Resolve user ids → names for older logs that stored raw ObjectIds
    const docs = await Promise.all(
      logs.map(async (log) => {
        try {
          if (!log?.changes || typeof log.changes !== "object") return log;
          const changes = await enrichActivityChanges(
            log.changes as Record<string, { from: unknown; to: unknown }>,
            log.entityType,
          );
          return { ...log, changes };
        } catch (error) {
          logger.error("Failed to enrich activity log changes", {
            logId: (log as { id?: string })?.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return log;
        }
      }),
    );

    return {
      docs,
      pagination: buildPagination({
        page,
        limit,
        totalDocs: total,
        docsCount: docs.length,
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
    const rawChanges = getObjectChanges(oldDoc, newDoc);

    if (Object.keys(rawChanges).length === 0) {
      return;
    }

    const enriched = await enrichActivityChanges(rawChanges, entityType);

    // Drop no-ops that enrich may normalize to the same display value
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [field, change] of Object.entries(enriched)) {
      if (!change) continue;
      const fromKey = JSON.stringify(change.from ?? null);
      const toKey = JSON.stringify(change.to ?? null);
      if (fromKey === toKey) continue;
      changes[field] = change;
    }

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
