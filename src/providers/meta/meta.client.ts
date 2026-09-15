// providers/meta/meta.client.ts

import axios, { AxiosInstance } from "axios";
import { config } from "../../config/index.js";

export class MetaClient {
  private readonly graphApi: AxiosInstance;

  private readonly appId = config.meta.APP_ID!;
  private readonly appSecret = config.meta.APP_SECRET;
  private readonly graphBaseUrl = config.meta.GRAPH_BASE_URL;
  private readonly graphVersion = config.meta.GRAPH_VERSION;

  constructor() {
    this.graphApi = axios.create({
      baseURL: `${this.graphBaseUrl}/${this.graphVersion}`,
      timeout: 30000,
    });
  }

  /**
   * Exchange Meta authorization code for access token
   */
  async exchangeCode(code: string) {
    const { data } = await this.graphApi.get("/oauth/access_token", {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: config.meta.REDIRECT_URI,
        code,
      },
    });

    return data;
  }

  /**
   * Exchange a short-lived user token for a long-lived user token
   */
  async getLongLivedUserToken(shortLivedToken: string) {
    const { data } = await this.graphApi.get("/oauth/access_token", {
      params: {
        grant_type: "fb_exchange_token",
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    return data;
  }

  /**
   * Get Facebook Pages available to the connected Meta account
   */
  async getFacebookPages(accessToken: string) {
    const { data } = await this.graphApi.get("/me/accounts", {
      params: {
        access_token: accessToken,
        fields: "id,name,username,category,link,picture,access_token,tasks",
      },
    });

    return data?.data ?? [];
  }

  /**
   * Get Facebook Page details
   */
  async getFacebookPage(pageId: string, pageAccessToken: string) {
    const { data } = await this.graphApi.get(`/${pageId}`, {
      params: {
        access_token: pageAccessToken,
        fields: "id,name,username,category,link,picture{url},about,description",
      },
    });

    return data;
  }

  /**
   * Get Instagram account connected to a Facebook Page
   */
  async getInstagramAccount(pageId: string, pageAccessToken: string) {
    const { data } = await this.graphApi.get(`/${pageId}`, {
      params: {
        access_token: pageAccessToken,
        fields:
          "instagram_business_account{id,username,name,profile_picture_url}",
      },
    });

    return data?.instagram_business_account ?? null;
  }

  /**
   * Subscribe Facebook Page to Lead Ads webhook
   */
  async subscribePageWebhook(pageId: string, pageAccessToken: string) {
    const { data } = await this.graphApi.post(
      `/${pageId}/subscribed_apps`,
      {},
      {
        params: {
          access_token: pageAccessToken,
          subscribed_fields: "leadgen",
        },
      },
    );

    return data;
  }

  /**
   * Fetch a Facebook Lead Ads lead by leadgen ID
   */
  async getLeadgen(leadgenId: string, pageAccessToken: string) {
    const { data } = await this.graphApi.get(`/${leadgenId}`, {
      params: {
        access_token: pageAccessToken,
        fields:
          "id,created_time,ad_id,adset_id,campaign_id,form_id,field_data,is_organic",
      },
    });

    return data;
  }

  /**
   * Get Page webhook subscriptions
   */
  async getPageSubscriptions(pageId: string, pageAccessToken: string) {
    const { data } = await this.graphApi.get(`/${pageId}/subscribed_apps`, {
      params: {
        access_token: pageAccessToken,
      },
    });

    return data;
  }
}
