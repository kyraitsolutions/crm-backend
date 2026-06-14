import { ClientSession, Types } from "mongoose";
import { WhatsAppAccountModel } from "../../../models/whatsapp-account.model";

export class WhatsAppAccountRepository {
  async createAndUpdate(data: any, session?: ClientSession) {
    return WhatsAppAccountModel.findOneAndUpdate(
      {
        integrationId: new Types.ObjectId(data.integrationId),
      },
      {
        $set: data,
      },
      {
        upsert: true,
        session,
      },
    );
  }

  async findByAccountId(accountId: string) {
    return WhatsAppAccountModel.findOne({
      accountId: new Types.ObjectId(accountId),
    });
  }

  async findByIntegrationId(integrationId: string) {
    return WhatsAppAccountModel.findOne({
      integrationId,
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
}
