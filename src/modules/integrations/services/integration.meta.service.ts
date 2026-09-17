import mongoose, { Types } from "mongoose";
import { config } from "../../../config/index.js";
import { IntegrationProvider } from "../../../models/integration.model.js";
import { MetaClient } from "../../../providers/meta/meta.client.js";
import { ActivityLogService } from "../../../services/activityLog.service.js";
import { TApiResponse } from "../../../types/api-response.type.js";
import { MetaAccountRepository } from "../../meta/account/repositories/meta-account.repository.js";
import { IntegrationCredentialRepository } from "../repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";

interface GenerateMetaAuthUrlParams {
  accountId: string;
  organizationId: string;
}

interface CompleteMetaSignupParams {
  code: string;
  accountId: string;
  organizationId: string;
}

export class MetaIntegrationService {
  constructor(
    private metaClient = new MetaClient(),
    private integrationRepo = new IntegrationRepository(),
    private credentialRepo = new IntegrationCredentialRepository(),
    private metaRepo = new MetaAccountRepository(),
  ) {}
  private activityLogService = new ActivityLogService();

  public generateMetaAuthUrl({
    accountId,
    organizationId,
  }: GenerateMetaAuthUrlParams): { signupUrl: string } {
    const appId = config.meta.APP_ID as string;
    const configId = "3168850996644844";
    const redirectUri = config.meta.REDIRECT_URI as string;

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      config_id: configId,
      response_type: "code",
      state: `{"accountId":"${accountId}","organizationId":"${organizationId}"}`,
    });

    return {
      signupUrl: `https://www.facebook.com/v24.0/dialog/oauth?${params.toString()}`,
    };
  }

  public async completeMetaSignup({
    code,
    organizationId,
    accountId,
  }: CompleteMetaSignupParams): Promise<TApiResponse<{}>> {
    const tokenResponse = await this.metaClient.exchangeCode(code);
    let accessToken = tokenResponse?.access_token;
    const tokenType = tokenResponse?.token_type || "bearer";

    if (!accessToken) {
      throw new Error("Meta access token not found");
    }


      const longLived = await this.metaClient.getLongLivedUserToken(
        accessToken,
      );

      if (longLived?.access_token) {
        accessToken = longLived.access_token;
      }
      
       const pages = await this.metaClient.getFacebookPages(accessToken);

    if (!pages?.length) {
      throw new Error("No Facebook Page found for this Meta account");
    }

    const page = pages[0];

    if (!page?.id) {
      throw new Error("Facebook Page ID not found");
    }

    if (!page?.access_token) {
      throw new Error("Facebook Page access token not found");
    }

    const facebookPage = await this.metaClient.getFacebookPage(
      page.id,
      page.access_token,
    );

    const instagramAccount = await this.metaClient.getInstagramAccount(
      page.id,
      page.access_token,
    );

    const webhookResponse = await this.metaClient.subscribePageWebhook(
      page.id,
      page.access_token,
    );

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const integration = await this.integrationRepo.createAndUpdate(
        {
          organizationId,
          accountId,
          providerResourceId: page.id,
          provider: IntegrationProvider.FACEBOOK,
        },
        session,
      );

      await this.credentialRepo.createAndUpdate(
        {
          integrationId: String(integration._id),
          accessToken: page.access_token,
          type: tokenType,
          tokenExpiresAt: null,
        },
        session,
      );

      const metaAccount = await this.metaRepo.createAndUpdate(
        {
          integrationId: String(integration._id),
          facebookPage: {
            id: facebookPage.id,
            name: facebookPage.name,
            username: facebookPage.username ?? page.username ?? null,
            category: facebookPage.category ?? page.category ?? null,
            link: facebookPage.link ?? page.link ?? null,
            picture:
              facebookPage.picture?.data?.url ?? page.picture?.data?.url ?? null,
            about: facebookPage.about ?? null,
            description: facebookPage.description ?? null,
            tasks: page.tasks ?? [],
          },
          instagram: instagramAccount
            ? {
                id: instagramAccount.id,
                username: instagramAccount.username ?? null,
                name: instagramAccount.name ?? null,
                profilePictureUrl:
                  instagramAccount.profile_picture_url ?? null,
              }
            : null,
          webhookSubscribed: Boolean(webhookResponse?.success),
          isConnected: true,
          connectedAt: new Date(),
          onboardingCompleted: true,
        },
        session,
      );

      await session.commitTransaction();

      await this.activityLogService.logCreate({
        accountId,
        organizationId,
        entityType: "integration",
        entityId: String(integration._id),
        actor: { type: "user", name: "" },
        metadata: { provider: IntegrationProvider.FACEBOOK },
      });

      return {
        doc: {
          integration,
          metaAccount,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async disconnect({
    integrationId,
    accountId,
  }: {
    integrationId: string;
    accountId: string;
  }) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const integration = await this.integrationRepo.findByFilter(
        {
          _id: new Types.ObjectId(integrationId),
          accountId: new Types.ObjectId(accountId),
          provider: IntegrationProvider.FACEBOOK,
        },
        session,
      );

      if (!integration) {
        throw new Error("Meta integration not found");
      }

      const updatedIntegration = await this.integrationRepo.disconnect(
        integrationId,
        session,
        IntegrationProvider.FACEBOOK,
      );

      const updatedMetaAccount = await this.metaRepo.disconnect(
        integrationId,
        session,
      );

      await session.commitTransaction();

      await this.activityLogService.logDelete({
        accountId,
        organizationId: String((integration as any)?.organizationId || ""),
        entityType: "integration",
        entityId: integrationId,
        actor: { type: "user", name: "" },
        metadata: { provider: IntegrationProvider.FACEBOOK },
        deletedData: { provider: IntegrationProvider.FACEBOOK },
      });

      return {
        doc: {
          integration: updatedIntegration,
          metaAccount: updatedMetaAccount,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
