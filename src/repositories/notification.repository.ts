import { ClientSession } from "mongoose";
import { Notification } from "../models/notification.model.js";
import { TCreateNotification, TNotification } from "../types/notification.type.js";

export class NotificationRepository {
  async findAll(organizationId: string): Promise<TNotification[]> {
    const docs = await Notification.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(100);
    return docs.map((doc) => doc.toJSON() as unknown as TNotification);
  }

  async countUnread(organizationId: string): Promise<number> {
    return Notification.countDocuments({ organizationId, isRead: false });
  }

  async findAccountsByIds(accountIds: string[]): Promise<TNotification[] | null> {
    return await Notification.find({ _id: { $in: accountIds } });
  }
  async findOne(accountId: string): Promise<TNotification | null> {
    return await Notification.findOne({ _id: accountId }).select("-userId");
  }
  async create(
    data: TCreateNotification,
    session?: ClientSession,
  ): Promise<TNotification> {
    return (
      await Notification.create([data], { session })
    )[0].toJSON() as unknown as TNotification;
  }

  async delete(id: string): Promise<boolean | null> {
    return await Notification.findByIdAndDelete(id);
  }

  async findByTypeIdAndUpdate(
    data: TCreateNotification,
    session?: ClientSession,
  ): Promise<TNotification> {
    return (
      await Notification.findOneAndUpdate(
      {
        organizationId: data.organizationId,
        type: data.type,
        typeId: data.typeId,
      },
      {
        $set: {
          title: data.title,
          description: data.description,
          channelType: data.channelType,
          accountId: data.accountId,
          meta: data.meta,
          updatedAt: new Date(),
          isRead: false,
          readAt: null,
        },

        $inc: {
          unreadCount: 1,
        },
      },
      {
        new: true,
        upsert: true,
        session,
        setDefaultsOnInsert: true,
      },
    )
    )?.toJSON() as unknown as TNotification;
  }

  async markAsRead(id: string, organizationId: string) {
    return Notification.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );
  }

  async markAllAsRead(organizationId: string) {
    await Notification.updateMany(
      { organizationId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }
}
