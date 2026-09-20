import { ClientSession, Types } from "mongoose";
import { MetaAccountModel } from "../models/meta-account.model.js";

export class MetaAccountRepository {
  async createAndUpdate(data: any, session?: ClientSession) {
    return MetaAccountModel.findOneAndUpdate(
      {
        integrationId: new Types.ObjectId(data.integrationId),
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
      $or: [{ "facebookPages.id": pageId }, { "facebookPage.id": pageId }],
    });
  }

  async findConnectedByPageId(pageId: string) {
    return MetaAccountModel.findOne({
      isConnected: true,
      $or: [{ "facebookPages.id": pageId }, { "facebookPage.id": pageId }],
    });
  }

  async findByInstagramId(instagramId: string) {
    return MetaAccountModel.findOne({
      $or: [
        { "facebookPages.instagram.id": instagramId },
        { "instagram.id": instagramId },
      ],
    });
  }

  async setActivePage(
    integrationId: string,
    pageId: string,
    session?: ClientSession,
  ) {
    return MetaAccountModel.findOneAndUpdate(
      {
        integrationId: new Types.ObjectId(integrationId),
        "facebookPages.id": pageId,
      },
      {
        $set: {
          activePageId: pageId,
        },
      },
      {
        new: true,
        session,
      },
    );
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
