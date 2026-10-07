import { HttpError } from "../../../utils/http.error.js";
import { NotificationMuteModel } from "../models/notification-mute.model.js";

export type MuteInput = {
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;
  until?: string | Date | null;
  reason?: string | null;
};

function parseUntil(until?: string | Date | null): Date | null {
  if (until == null || until === "") return null;
  const date = until instanceof Date ? until : new Date(until);
  if (Number.isNaN(date.getTime())) {
    throw HttpError.badRequest("Invalid mute until date");
  }
  return date;
}

export class NotificationMuteService {
  async mute(input: MuteInput) {
    const entityType = String(input.entityType || "").trim();
    const entityId = String(input.entityId || "").trim();
    if (!entityType || !entityId) {
      throw HttpError.badRequest("entityType and entityId are required");
    }

    const until = parseUntil(input.until);
    const doc = await NotificationMuteModel.findOneAndUpdate(
      {
        organizationId: input.organizationId,
        userId: input.userId,
        entityType,
        entityId,
      },
      {
        $set: {
          until,
          reason: input.reason || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return {
      id: String(doc?._id),
      organizationId: String(doc?.organizationId),
      userId: String(doc?.userId),
      entityType: doc?.entityType,
      entityId: doc?.entityId,
      until: doc?.until || null,
      reason: doc?.reason || null,
    };
  }

  async unmute(input: {
    organizationId: string;
    userId: string;
    entityType: string;
    entityId: string;
  }) {
    await NotificationMuteModel.deleteOne({
      organizationId: input.organizationId,
      userId: input.userId,
      entityType: String(input.entityType || "").trim(),
      entityId: String(input.entityId || "").trim(),
    });
    return { success: true };
  }

  async list(organizationId: string, userId: string) {
    const now = new Date();
    // Drop expired mutes opportunistically
    await NotificationMuteModel.deleteMany({
      organizationId,
      userId,
      until: { $ne: null, $lte: now },
    });

    const rows = await NotificationMuteModel.find({
      organizationId,
      userId,
      $or: [{ until: null }, { until: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      docs: rows.map((row) => ({
        id: String(row._id),
        entityType: row.entityType,
        entityId: row.entityId,
        until: row.until || null,
        reason: row.reason || null,
        createdAt: row.createdAt,
      })),
    };
  }

  /**
   * Returns muted userIds among the candidates for a given entity.
   */
  async findMutedUserIds(input: {
    organizationId: string;
    userIds: string[];
    entityType?: string | null;
    entityId?: string | null;
    now?: Date;
  }): Promise<Set<string>> {
    const muted = new Set<string>();
    if (
      !input.userIds.length ||
      !input.entityType ||
      !input.entityId
    ) {
      return muted;
    }

    const now = input.now || new Date();
    const rows = await NotificationMuteModel.find({
      organizationId: input.organizationId,
      userId: { $in: input.userIds },
      entityType: input.entityType,
      entityId: String(input.entityId),
      $or: [{ until: null }, { until: { $gt: now } }],
    })
      .select("userId")
      .lean();

    for (const row of rows) {
      muted.add(String(row.userId));
    }
    return muted;
  }
}

export const notificationMuteService = new NotificationMuteService();
