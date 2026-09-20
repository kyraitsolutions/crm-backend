import mongoose, { Types } from "mongoose";
import { config } from "../../../config/index.js";
import { IntegrationProvider } from "../../../models/integration.model.js";
import { MetaClient } from "../../../providers/meta/meta.client.js";
import { ActivityLogService } from "../../../services/activityLog.service.js";
import { TApiResponse } from "../../../types/api-response.type.js";
import { HttpError } from "../../../utils/http.error.js";
import { MetaAccountRepository } from "../../meta/account/repositories/meta-account.repository.js";
import { IntegrationCredentialRepository } from "../repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";
import { TStoredFacebookPage } from "../types/index.js";
import {
  getStoredFacebookPages,
  toPublicFacebookPage,
  toPublicMetaAccount,
} from "../utils/meta-account.utils.js";

interface GenerateMetaAuthUrlParams {
  accountId: string;
  organizationId: string;
}

interface CompleteMetaSignupParams {
  code: string;
  accountId: string;
  organizationId: string;
}

const REQUIRED_META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "leads_retrieval",
];

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
  }: GenerateMetaAuthUrlParams): TApiResponse<{
    signupUrl: string;
  }> {
    const appId = config.meta.APP_ID as string;
    const configId = config.meta.CONFIG_ID;
    const redirectUri = config.meta.REDIRECT_URI as string;

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      config_id: configId,
      response_type: "code",
      "scope": "pages_show_list pages_read_engagement pages_manage_metadata leads_retrieval",
      auth_type: "rerequest",
      state: `{"accountId":"${accountId}","organizationId":"${organizationId}"}`,
    });

    const metaBaseUrl = "https://www.facebook.com";
    const signupUrl = `${metaBaseUrl}/${config.meta.GRAPH_VERSION}/dialog/oauth?${params.toString()}`;

    return {
      doc: {
        signupUrl,
      },
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

    const debugToken = await this.metaClient.debugToken(accessToken);
    const grantedScopes: string[] = debugToken?.data?.scopes ?? [];

  

    if (!accessToken) {
      throw new Error("Meta access token not found");
    }

    const missingScopes = REQUIRED_META_SCOPES.filter(
      (scope) => !grantedScopes.includes(scope),
    );

    if (missingScopes.length) {
      console.warn(
        `Meta Login Configuration did not grant: ${missingScopes.join(", ")}. ` +
          "Checking a permission in App Dashboard is not enough — add it to the Facebook Login for Business configuration used as META_CONFIG_ID, then connect again.",
      );
    }

    const longLived = await this.metaClient.getLongLivedUserToken(accessToken);

    if (longLived?.access_token) {
      accessToken = longLived.access_token;
    }

    const pages = await this.metaClient.getFacebookPages(accessToken);
    console.log("pages", pages);

    if (!pages?.length) {
      throw new Error("No Facebook Page found for this Meta account");
    }

    const facebookPages = pages
      .map((page: any) => this.mapStoredPage(page))
      .filter((page: TStoredFacebookPage | null): page is TStoredFacebookPage =>
        Boolean(page?.id && page?.accessToken),
      );
    console.log("facebookPages", facebookPages);

    if (!facebookPages.length) {
      throw new Error("No Facebook Page access token found");
    }

    const webhookResults = await Promise.all(
      facebookPages.map(async (page: TStoredFacebookPage) => {
        const webhookResponse = await this.metaClient.subscribePageWebhook(
          page.id,
          page.accessToken as string,
        );

        return {
          ...page,
          webhookSubscribed: Boolean(webhookResponse?.success),
        };
      }),
    );


    const activePage = webhookResults[0];
    const publicActivePage = toPublicFacebookPage(activePage);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const integration = await this.integrationRepo.createAndUpdateByAccount(
        {
          organizationId,
          accountId,
          providerResourceId: activePage.id,
          provider: IntegrationProvider.FACEBOOK,
        },
        session,
      );

      await this.credentialRepo.createAndUpdate(
        {
          integrationId: String(integration._id),
          accessToken,
          type: tokenType,
          tokenExpiresAt: null,
        },
        session,
      );

      const metaAccount = await this.metaRepo.createAndUpdate(
        {
          integrationId: String(integration._id),
          facebookPages: webhookResults,
          activePageId: activePage.id,
          facebookPage: publicActivePage,
          instagram: activePage.instagram ?? null,
          webhookSubscribed: Boolean(activePage.webhookSubscribed),
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
          metaAccount: toPublicMetaAccount(metaAccount),
        },
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async setActivePage({
    accountId,
    pageId,
  }: {
    accountId: string;
    pageId: string;
  }) {
    if (!pageId) {
      throw HttpError.badRequest("Facebook Page ID is required");
    }

    const integration = await this.integrationRepo.findByAccountAndProvider(
      accountId,
      IntegrationProvider.FACEBOOK,
    );

    if (!integration) {
      throw HttpError.notFound("Facebook integration is not connected");
    }

    const metaAccount = await this.metaRepo.findByIntegrationId(
      String(integration._id),
    );
    const pages = getStoredFacebookPages(metaAccount);
    const selectedPage = pages.find((page) => page.id === pageId);

    if (!selectedPage) {
      throw HttpError.notFound("Facebook Page not found on this connection");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await this.integrationRepo.updateProviderResourceId(
        String(integration._id),
        pageId,
        session,
      );

      const publicPage = toPublicFacebookPage(selectedPage);
      const updatedMetaAccount = await this.metaRepo.createAndUpdate(
        {
          integrationId: String(integration._id),
          facebookPages: pages,
          activePageId: pageId,
          facebookPage: publicPage,
          instagram: selectedPage.instagram ?? null,
          webhookSubscribed: Boolean(selectedPage.webhookSubscribed),
          isConnected: true,
        },
        session,
      );

      await session.commitTransaction();

      return {
        doc: toPublicMetaAccount(updatedMetaAccount),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private mapStoredPage(page: any): TStoredFacebookPage | null {
    if (!page?.id) return null;

    return {
      id: String(page.id),
      name: page.name || "Facebook Page",
      username: page.username ?? null,
      category: page.category ?? null,
      link: page.link ?? null,
      picture: page.picture?.data?.url ?? null,
      about: page.about ?? null,
      description: page.description ?? null,
      tasks: page.tasks ?? [],
      accessToken: page.access_token ?? null,
      webhookSubscribed: false,
      instagram: null,
    };
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
