import { Job } from "bull";
import { contactSyncQueue } from "../../queue/index.js";
import { ConversationModel } from "../../models/conversations.model.js";
import { Types } from "mongoose";

contactSyncQueue.process(
  async (
    job: Job<{
      stateSync: any[];
      accountId: string;
    }>,
  ) => {
    console.log("jobData", job.data);
    const { stateSync, accountId } = job.data;

    console.log(`Processing Contact Sync Job ${job.id}`);

    console.log("Contact Sync Job", accountId);

    for (const contactEvent of stateSync) {
      if (contactEvent.type !== "contact") {
        continue;
      }

      const { action, contact } = contactEvent;
      const { phone_number, full_name, user_id } = contact;

      console.log("Contact Event", action, phone_number, full_name, user_id);
      //   console.log("Contact Event", phone_number, full_name, user_id);

      switch (action) {
        case "add":
        case "update": {
          await ConversationModel.findOneAndUpdate(
            {
              "identifiers.whatsappUserId": phone_number,
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

          // Contact also created here

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
