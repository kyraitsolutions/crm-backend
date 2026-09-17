import { Job } from "bull";
import { Types } from "mongoose";
import { ConversationModel } from "../../models/conversations.model.js";
import { contactSyncQueue } from "../../queue/index.js";
import { ContactRepository } from "../../repositories/contact.repository.js";
import { ContactService } from "../../services/contact.service.js";
import logger from "../../utils/logger.js";

const contactService = new ContactService(new ContactRepository());

contactSyncQueue.process(
  async (
    job: Job<{
      stateSync: any[];
      accountId: string;
    }>,
  ) => {
    const { stateSync, accountId } = job.data;

    for (const contactEvent of stateSync) {
      if (contactEvent.type !== "contact") {
        continue;
      }

      const { action, contact } = contactEvent;
      const { phone_number, full_name, user_id } = contact;

      switch (action) {
        case "add":
        case "update": {
          await ConversationModel.findOneAndUpdate(
            {
              "contact.phoneNumber": phone_number,
              platform: "whatsapp",
              accountId: new Types.ObjectId(accountId),
            },
            {
              $set: {
                "identifiers.whatsappUserId": phone_number,
                "contact.name": full_name,
                "contact.phoneNumber": phone_number,
                "metadata.whatsapp.userId": user_id,
              },
              $setOnInsert: {
                accountId: new Types.ObjectId(accountId),
              },
            },
            {
              upsert: true,
              new: true,
            },
          );

          const upserted = await contactService.upsertFromLead({
            accountId,
            name: full_name,
            phone: phone_number,
            source: "whatsapp",
          });
          if (!upserted) {
            logger.warn("WHATSAPP_SYNC_CONTACT_NOT_CREATED", {
              accountId,
              phone: phone_number,
            });
          }

          break;
        }

        case "remove": {
          await ConversationModel.deleteOne({
            "identifiers.whatsappUserId": phone_number,
            platform: "whatsapp",
          });

          break;
        }
      }
    }

    console.log(`Contact Sync Job ${job.id} completed`);
  },
);
