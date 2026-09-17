import { ClientSession, Types } from "mongoose";
import { MetaAccountModel } from "../models/meta-account.model.js";

export class MetaAccountRepository {
  async createAndUpdate(data: any, session?: ClientSession) {
    return MetaAccountModel.findOneAndUpdate(
      {
        integrationId: new Types.ObjectId(data.integrationId),
        "facebookPage.id": data.facebookPage.id,
      },
      {
        $set: data,
      },
      {
        upsert: true,
        new: true,
        session,
      },
    );
  }

  async findByIntegrationId(integrationId: string) {
    const filter = Types.ObjectId.isValid(integrationId)
      ? { integrationId: new Types.ObjectId(integrationId) }
      : { integrationId };
    return MetaAccountModel.findOne(filter);
  }

  async findByPageId(pageId: string) {
    return MetaAccountModel.findOne({
      "facebookPage.id": pageId,
    });
  }

  async findConnectedByPageId(pageId: string) {
    return MetaAccountModel.findOne({
      "facebookPage.id": pageId,
      isConnected: true,
    });
  }

  async findByInstagramId(instagramId: string) {
    return MetaAccountModel.findOne({
      "instagram.id": instagramId,
    });
  }

  async disconnect(integrationId: string, session?: ClientSession) {
    return MetaAccountModel.findOneAndUpdate(
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
