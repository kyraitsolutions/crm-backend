import { ClientSession } from "mongoose";
import { Notification } from "../models/notification.model.js";
import { TCreateNotification, TNotification } from "../types/notification.type.js";

export class NotificationRepository {
  async findAll(id: string): Promise<TNotification[] | null> {
    return await Notification.find({ organizationId: id });
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
    return await Notification.findOneAndUpdate(
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
          meta: data.meta,
          updatedAt: new Date(),
          isRead: false,
        },

        $inc: {
          unreadCount: 1,
        },
      },
      {
        new: true,
        upsert: true, // create if not exists
        session,
        setDefaultsOnInsert: true,
      },
    )
  }
}
