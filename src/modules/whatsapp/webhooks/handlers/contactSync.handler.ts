import {
  IntegrationModel,
  IntegrationProvider,
} from "../../../../models/integration.model.js";
import { contactSyncQueue } from "../../../../queue/index.js";
import { WhatsAppAccountModel } from "../../account/models/whatsapp-account.model.js";

export class ContactSyncHandler {
  public async handle(payload: any): Promise<void> {
    console.log("ContactSyncHandler", JSON.stringify(payload, null, 2));

    const { state_sync, metadata } = payload;
    const { phone_number_id } = metadata;

    const existInegration = await IntegrationModel.findOne({
      provider: IntegrationProvider.WHATSAPP,
      providerResourceId: String(phone_number_id),
    });

    if (!existInegration) {
      console.log("Integration not found");
      return;
    }

    if (!state_sync?.length) {
      return;
    }

    await contactSyncQueue.add(
      {
        stateSync: state_sync,
        accountId: existInegration.accountId,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}

export const contactSyncHandler = new ContactSyncHandler();

// import { ConversationModel } from "../../../../models/conversations.model.js";

// export class ContactSyncHandler {
//   public async handle(payload: any): Promise<void> {
//     console.log("ContactSyncHandler", JSON.stringify(payload, null, 2));

//     const { state_sync } = payload;

//     if (!state_sync?.length) {
//       return;
//     }

//     for (const contactEvent of state_sync) {
//       //   if (contactEvent.type !== "contact") {
//       //     continue;
//       //   }

//       //   if (contactEvent.action !== "add") {
//       //     continue;
//       //   }

//       const { phone_number, full_name, user_id } = contactEvent.contact;

//       const conversation = await ConversationModel.findOne({
//         "identifiers.whatsappUserId": phone_number,
//       });

//       // console.log("conversation", conversation);

//       if (!conversation) {
//         continue;
//       }

//       await ConversationModel.updateOne(
//         { _id: conversation._id },
//         {
//           $set: {
//             "identifiers.fullName": full_name,
//             "identifiers.phoneNumber": phone_number,
//             "identifiers.userId": user_id,
//           },
//         },
//       );
//     }

//     return;
//   }
// }

// export const contactSyncHandler = new ContactSyncHandler();
