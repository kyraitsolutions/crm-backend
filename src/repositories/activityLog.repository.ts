import { ActivityLog } from "../models/activityLog.model";

export class ActivityLogRepository {
  async create(data: any) {
    return await ActivityLog.create(data);
  }

  async createMany(data: any[]) {
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
}
