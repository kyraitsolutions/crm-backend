import { ActivityLog } from "../models/activityLog.model.js";
import { TActivityLog } from "../types/activityLog.type.js";

export class ActivityLogRepository {
  async count(filter: any) {
    return ActivityLog.countDocuments(filter);
  }

  async find(
    filter: any,
    options?: {
      skip: number;
      limit: number;
      sort: Record<string, 1 | -1>;
    },
  ) {
    return ActivityLog.find(filter)
      .sort(options?.sort ?? { createdAt: -1 })
      .skip(options?.skip ?? 0)
      .limit(Number(options?.limit))
      .lean();
  }

  async create(data: Partial<TActivityLog>): Promise<TActivityLog | null> {
    return (await ActivityLog.create([data]))[0].toJSON();
  }

  async createMany(data: Partial<TActivityLog>[]) {
    return await ActivityLog.insertMany(data);
  }

  async findByEntity(entityType: string, entityId: string, limit = 50) {
    return await ActivityLog.find({
      entityType,
      entityId,
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findById(id: string) {
    return ActivityLog.findById(id).lean();
  }
}
