import { AccountModel } from "../../../models/accounts.model.js";
import { ConversationModel } from "../../../models/conversations.model.js";
import logger from "../../../utils/logger.js";
import { notificationDispatchService } from "./notification-dispatch.service.js";

/** Default unanswered threshold before SLA notification. */
export const DEFAULT_UNANSWERED_SLA_MS = 15 * 60 * 1000;

/**
 * Finds open conversations waiting on a human reply and dispatches
 * `conversation.unanswered_sla` once per breach window.
 */
export class NotificationSlaService {
  async sweepUnanswered(options?: {
    thresholdMs?: number;
    limit?: number;
    now?: Date;
  }) {
    const now = options?.now || new Date();
    const thresholdMs = options?.thresholdMs ?? DEFAULT_UNANSWERED_SLA_MS;
    const cutoff = new Date(now.getTime() - thresholdMs);
    const limit = options?.limit ?? 100;

    const conversations = await ConversationModel.find({
      status: { $in: ["open", "pending", "assigned"] },
      isDeleted: { $ne: true },
      "lastMessage.from": "user",
      $or: [
        { customerLastMessageAt: { $lte: cutoff, $ne: null } },
        {
          customerLastMessageAt: null,
          "lastMessage.updatedAt": { $lte: cutoff },
        },
      ],
      "metadata.notificationSlaNotifiedAt": { $exists: false },
    })
      .sort({ customerLastMessageAt: 1 })
      .limit(limit)
      .lean();

    let dispatched = 0;

    for (const convo of conversations) {
      try {
        const accountId = String(convo.accountId || "");
        if (!accountId) continue;

        const account = await AccountModel.findById(accountId)
          .select("organizationId")
          .lean();
        const organizationId = String(account?.organizationId || "");
        if (!organizationId) continue;

        const conversationId = String(convo._id);
        const who =
          String((convo as any)?.contact?.name || "").trim() ||
          String((convo as any)?.contact?.phoneNumber || "").trim() ||
          "a customer";
        const platform = String(convo.platform || "whatsapp");
        const assigneeId =
          (convo as any)?.metadata?.liveChat?.assigneeId ||
          (convo as any)?.assigneeId ||
          null;

        await notificationDispatchService.dispatch({
          eventKey: "conversation.unanswered_sla",
          organizationId,
          accountId,
          source: platform,
          entityType: "conversation",
          entityId: conversationId,
          typeId: `sla:${conversationId}`,
          assigneeId: assigneeId ? String(assigneeId) : null,
          title: `Unanswered ${platform} conversation`,
          body: `${who} is waiting for a reply`,
          deepLink: `/dashboard`,
          groupKey: `conversation.unanswered_sla:${conversationId}`,
          payload: {
            conversationId,
            platform,
            phone: (convo as any)?.contact?.phoneNumber,
            kind: "unanswered_sla",
          },
          isPriority: true,
        });

        await ConversationModel.updateOne(
          { _id: convo._id },
          {
            $set: {
              "metadata.notificationSlaNotifiedAt": now,
            },
          },
        );
        dispatched += 1;
      } catch (error) {
        logger.warn("SLA notification dispatch failed", {
          conversationId: String(convo._id),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Clear SLA marker when agent/bot replied so a future wait can re-notify.
    await ConversationModel.updateMany(
      {
        "metadata.notificationSlaNotifiedAt": { $exists: true },
        "lastMessage.from": { $in: ["me", "bot"] },
      },
      { $unset: { "metadata.notificationSlaNotifiedAt": 1 } },
    );

    if (dispatched) {
      logger.info("Unanswered SLA sweep complete", {
        scanned: conversations.length,
        dispatched,
      });
    }

    return { scanned: conversations.length, dispatched };
  }
}

export const notificationSlaService = new NotificationSlaService();
