import { ClientSession } from "mongoose";
import { IntegrationCredentialModel } from "../../../models/integration-credential.model.js";

export class IntegrationCredentialRepository {
  async createAndUpdate(
    data: {
      integrationId: string;
      accessToken: string;
      type: string;
      tokenExpiresAt?: Date;
    },
    session?: ClientSession,
  ) {
    return IntegrationCredentialModel.findOneAndUpdate(
      {
        integrationId: data.integrationId,
      },
      {
        $set: {
          accessToken: data.accessToken,
          type: data.type,
          tokenExpiresAt: data.tokenExpiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        session,
      },
    );
  }

  async findByIntegrationId(integrationId: string) {
    return IntegrationCredentialModel.findOne({
      integrationId,
    });
  }

  async updateAccessToken(integrationId: string, accessToken: string) {
    return IntegrationCredentialModel.findOneAndUpdate(
      {
        integrationId,
      },
      {
        accessToken,
      },
      {
        new: true,
      },
    );
  }
}
