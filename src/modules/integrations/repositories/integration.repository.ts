import { ClientSession } from "mongoose";
import {
  IntegrationModel,
  IntegrationProvider,
  IntegrationStatus,
} from "../../../models/integration.model.js";
import { Types } from "mongoose";

export class IntegrationRepository {
  async createAndUpdate(
    data: {
      organizationId: string;
      accountId: string;
      provider: IntegrationProvider;
    },
    session?: ClientSession,
  ) {
    return IntegrationModel.findOneAndUpdate(
      {
        organizationId: new Types.ObjectId(data.organizationId),
        accountId: new Types.ObjectId(data.accountId),
        provider: data.provider,
      },
      {
        $set: {
          ...data,
          status: IntegrationStatus.CONNECTED,
        },
      },
      {
        upsert: true,
        new: true,
        session,
      },
    );
  }

  async findByAccountAndProvider(
    accountId: string,
    provider: IntegrationProvider,
  ) {
    return IntegrationModel.findOne({
      accountId: new Types.ObjectId(accountId),
      provider,
      status: IntegrationStatus.CONNECTED,
    });
  }

  async disconnect(integrationId: string) {
    return IntegrationModel.findByIdAndUpdate(integrationId, {
      status: IntegrationStatus.DISCONNECTED,
    });
  }
}
