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
   * Debug a token
   */
  async debugToken(accessToken: string) {
    const { data } = await this.graphApi.get("/debug_token", {
      params: {
        input_token: accessToken,
        access_token: `${this.appId}|${this.appSecret}`,
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
    try {
      const { data } = await this.graphApi.get(`/${pageId}`, {
        params: {
          access_token: pageAccessToken,
          fields: "id,name,username,category,link,picture{url},about,description",
        },
      });
      return data;
    } catch (error: any) {
      throw error;
     
    }
  }

  /**
   * Get Instagram account connected to a Facebook Page
   */
  async getInstagramAccount(pageId: string, pageAccessToken: string) {
    try {
      const { data } = await this.graphApi.get(`/${pageId}`, {
        params: {
          access_token: pageAccessToken,
          fields:
            "instagram_business_account{id,username,name,profile_picture_url}",
        },
      });
      console.log("instagram data", data);
      return data?.instagram_business_account ?? null;
    } catch (error) {
      throw error;
    
    }
  }

  /**
   * Subscribe Facebook Page to Lead Ads webhook
   */
  async subscribePageWebhook(pageId: string, pageAccessToken: string) {
    try {
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
    } catch (error: any) {
      console.log("subscribePageWebhook error", error?.response?.data);
      return { success: false };
    }
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

  async getPagePosts(
    pageId: string,
    pageAccessToken: string,
    options?: { limit?: number; offset?: number },
  ) {
    const params: Record<string, string | number> = {
      access_token: pageAccessToken,
      fields:
        "id,message,story,created_time,permalink_url,full_picture,status_type,shares,reactions.summary(true),comments.summary(true),is_published",
      limit: options?.limit ?? 12,
      offset: options?.offset ?? 0,
    };

    try {
      const { data } = await this.graphApi.get(`/${pageId}/published_posts`, {
        params,
      });
      return this.toGraphList(data);
    } catch (publishedError) {
      try {
        const { data } = await this.graphApi.get(`/${pageId}/posts`, {
          params,
        });
        return this.toGraphList(data);
      } catch (error) {
        return this.toGraphListError(error);
      }
    }
  }

  async getLeadgenForms(
    pageId: string,
    pageAccessToken: string,
    options?: { limit?: number; offset?: number },
  ) {
    const params: Record<string, string | number> = {
      access_token: pageAccessToken,
      fields:
        "id,name,status,leads_count,created_time,locale,page_id,questions,privacy_policy_url",
      limit: options?.limit ?? 25,
      offset: options?.offset ?? 0,
    };

    try {
      const { data } = await this.graphApi.get(`/${pageId}/leadgen_forms`, {
        params,
      });
      return this.toGraphList(data);
    } catch (error) {
      return this.toGraphListError(error);
    }
  }

  async getPageSnapshot(pageId: string, pageAccessToken: string) {
    try {
      const { data } = await this.graphApi.get(`/${pageId}`, {
        params: {
          access_token: pageAccessToken,
          fields:
            "id,name,fan_count,followers_count,rating_count,overall_star_rating,talking_about_count,were_here_count",
        },
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.extractGraphError(error) };
    }
  }

  async getPageInsights(pageId: string, pageAccessToken: string) {
    try {
      const { data } = await this.graphApi.get(`/${pageId}/insights`, {
        params: {
          access_token: pageAccessToken,
          metric: [
            "page_fans",
            "page_follows",
            "page_impressions",
            "page_impressions_unique",
            "page_post_engagements",
            "page_views_total",
          ].join(","),
          period: "day",
        },
      });
      return { data: data?.data ?? [], error: null };
    } catch (error) {
      return { data: [], error: this.extractGraphError(error) };
    }
  }

  private toGraphList(data: any) {
    return {
      data: data?.data ?? [],
      paging: data?.paging ?? null,
      error: null,
    };
  }

  private toGraphListError(error: unknown) {
    return {
      data: [],
      paging: null,
      error: this.extractGraphError(error),
    };
  }

  private extractGraphError(error: any) {
    return (
      error?.response?.data?.error ?? {
        message: error?.message || "Meta Graph request failed",
      }
    );
  }
}
