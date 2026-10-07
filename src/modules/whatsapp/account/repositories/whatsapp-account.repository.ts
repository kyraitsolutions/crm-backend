import { ClientSession, Types } from "mongoose";
import { WhatsAppAccountModel } from "../models/whatsapp-account.model.js";

export class WhatsAppAccountRepository {
  async createAndUpdate(data: any, session?: ClientSession) {
    const { contactSyncWindowStartedAt, ...rest } = data || {};

    const filter = {
      integrationId: new Types.ObjectId(data.integrationId),
      "phoneNumberInfo.id": data.phoneNumberInfo.id,
    };

    const $set: Record<string, unknown> = {
      ...rest,
      isConnected: true,
    };

    // Open the 24h contact-sync window only when it is currently null
    // (fresh coexistence onboard, or re-onboard after disconnect cleared it).
    // Later reconnects must not move this timestamp.
    if (contactSyncWindowStartedAt) {
      const existing = await WhatsAppAccountModel.findOne(filter)
        .select("contactSyncWindowStartedAt")
        .session(session || null)
        .lean();

      if (!existing?.contactSyncWindowStartedAt) {
        $set.contactSyncWindowStartedAt = contactSyncWindowStartedAt;
      }
    }

    return WhatsAppAccountModel.findOneAndUpdate(
      filter,
      { $set },
      {
        upsert: true,
        session,
        new: true,
      },
    );
  }

  async findByAccountId(accountId: string) {
    return WhatsAppAccountModel.findOne({
      accountId: new Types.ObjectId(accountId),
    });
  }

  async findByIntegrationId(integrationId: string) {
    const filter = Types.ObjectId.isValid(integrationId)
      ? { integrationId: new Types.ObjectId(integrationId) }
      : { integrationId };
    return WhatsAppAccountModel.findOne(filter);
  }

  async findByPhoneNumberId(phoneNumberId: string) {
    return WhatsAppAccountModel.findOne({
      "phoneNumberInfo.id": phoneNumberId,
    });
  }

  async updateByIntegrationId(integrationId: string, data: any) {
    return WhatsAppAccountModel.findOneAndUpdate(
      {
        integrationId,
      },
      {
        $set: data,
      },
      {
        new: true,
      },
    );
  }

  async disconnect(integrationId: string, session?: ClientSession) {
    return WhatsAppAccountModel.findOneAndUpdate(
      {
        integrationId: new Types.ObjectId(integrationId),
      },
      {
        $set: {
          isConnected: false,
        },
      },
      {
        new: true,
        session,
      },
    );
  }
}
