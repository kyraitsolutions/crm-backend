// providers/whatsapp/whatsapp.client.ts

import axios, { AxiosInstance } from "axios";
import { config } from "../../config/index.js";

export class WhatsAppClient {
  private readonly graphApi: AxiosInstance;
  private readonly appId = config.meta.APP_ID!;
  private readonly appSecret = config.meta.APP_SECRET;
  private readonly graphVersion = config.meta.GRAPH_VERSION;
  private readonly redirectUri = config.meta.REDIRECT_URI;

  constructor() {
    this.graphApi = axios.create({
      baseURL: `https://graph.facebook.com/${this.graphVersion}`,
      timeout: 30000,
    });
  }

  generateConnectUrl(payload: { accountId: string; organizationId: string }) {
    const state = Buffer.from(
      JSON.stringify({
        accountId: payload.accountId,
        organizationId: payload.organizationId,
      }),
    ).toString("base64");

    // const params = new URLSearchParams({
    //   client_id: config.meta.APP_ID,
    //   redirect_uri: config.meta.REDIRECT_URI as string,
    //   response_type: "code",
    //   scope: [
    //     "whatsapp_business_management",
    //     "whatsapp_business_messaging",
    //     // "business_management",
    //   ].join(","),

    //   state,
    // });

    const signupUrl =
      `https://www.facebook.com/${config.meta.GRAPH_VERSION}/dialog/oauth` +
      `?client_id=${config.meta.APP_ID}` +
      `&redirect_uri=${encodeURIComponent(config.meta.REDIRECT_URI as string)}` +
      `&response_type=code` +
      `&state=${state}` +
      `&scope=${encodeURIComponent("business_management, whatsapp_business_management,whatsapp_business_messaging")}` +
      `&extras=${encodeURIComponent(
        JSON.stringify({
          feature: "whatsapp_embedded_signup",
          setup: { business: { isWebsiteRequired: false } },
        }),
      )}`;

    return signupUrl;

    // return `https://www.facebook.com/${process.env.META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCode(code: string) {
    const { data } = await this.graphApi.get("/oauth/access_token", {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code,
      },
    });

    return data;
  }
  async getDebugToken(accessToken: string) {
    const { data } = await this.graphApi.get("/debug_token", {
      params: {
        input_token: accessToken,
        access_token: `${this.appId}|${this.appSecret}`,
      },
    });

    return data.data;
  }
  async getWabaId(accessToken: string) {
    const debugToken = await this.getDebugToken(accessToken);

    const scope = debugToken.granular_scopes?.find(
      (item: any) => item.scope === "whatsapp_business_management",
    );

    if (!scope?.target_ids?.length) {
      throw new Error("WABA ID not found");
    }

    return scope.target_ids[0];
  }

  async getWaba(wabaId: string, accessToken: string) {
    const { data } = await this.graphApi.get(`/${wabaId}`, {
      params: {
        access_token: accessToken,
        fields: "id,name,timezone_id,owner_business_info",
      },
    });

    return data;
  }

  async getBusinessInfo(wabaId: string, accessToken: string) {
    const waba = await this.getWaba(wabaId, accessToken);

    return {
      id: waba.owner_business_info?.id,
      name: waba.owner_business_info?.name,
    };
  }

  async getWabaInfo(wabaId: string, accessToken: string) {
    const waba = await this.getWaba(wabaId, accessToken);

    return {
      id: waba.id,
      name: waba.name,
      timezone: waba.timezone_id,
      marketingMessagesOnboardingStatus:
        waba?.owner_business_info?.marketing_messages_onboarding_status?.status,
    };
  }

  async getPhoneNumberInfo(wabaId: string, accessToken: string) {
    const { data } = await this.graphApi.get(`/${wabaId}/phone_numbers`, {
      params: {
        access_token: accessToken,

        fields:
          "id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,account_mode,is_official_business_account,name_status,new_name_status,platform_type",
      },
    });

    console.log("phone number data", data?.data);

    const phone = data.data?.[0];

    return {
      id: phone.id,

      displayPhoneNumber: phone.display_phone_number,

      verifiedName: phone.verified_name,

      qualityRating: phone.quality_rating,

      messagingLimitTier: phone.messaging_limit_tier,

      accountMode: phone.account_mode,

      platformType: phone.platform_type,

      isOfficialBusinessAccount: phone.is_official_business_account,

      nameStatus: phone.name_status,
    };
  }

  async getBusinessProfile(phoneNumberId: string, accessToken: string) {
    const { data } = await this.graphApi.get(
      `/${phoneNumberId}/whatsapp_business_profile`,
      {
        params: {
          access_token: accessToken,

          fields: "about,address,description,email,websites,vertical",
        },
      },
    );

    console.log("business profile data", data?.data);

    return data.data?.[0] ?? null;
  }

  async getEmbeddedSignupDetails(accessToken: string) {
    const wabaId = await this.getWabaId(accessToken);

    const businessInfo = await this.getBusinessInfo(wabaId, accessToken);

    const wabaInfo = await this.getWabaInfo(wabaId, accessToken);

    const phoneNumberInfo = await this.getPhoneNumberInfo(wabaId, accessToken);

    const businessProfile = await this.getBusinessProfile(
      phoneNumberInfo.id,
      accessToken,
    );

    return {
      businessInfo,
      wabaInfo,
      phoneNumberInfo,
      businessProfile,
    };
  }

  async registerPhoneNumber(payload: {
    phoneNumberId: string;
    accessToken: string;
    pin: string;
  }) {
    try {
      const { data } = await this.graphApi.post(
        `/${payload.phoneNumberId}/register`,
        {
          messaging_product: "whatsapp",
          pin: payload.pin,
        },
        {
          params: {
            access_token: payload.accessToken,
          },
        },
      );

      return data;
    } catch (error) {
      throw error;
    }
  }

  async subscribeWebhook(wabaId: string, accessToken: string) {
    const { data } = await this.graphApi.post(
      `/${wabaId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: accessToken,
        },
      },
    );

    return data;
  }
}
