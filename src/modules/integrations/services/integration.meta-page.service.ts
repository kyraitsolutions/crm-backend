import { IntegrationProvider } from "../../../models/integration.model.js";
import { MetaClient } from "../../../providers/meta/meta.client.js";
import { LeadRespository } from "../../../repositories/lead.respository.js";
import { TApiResponse } from "../../../types/api-response.type.js";
import { HttpError } from "../../../utils/http.error.js";
import { buildPagination } from "../../../utils/paginationBuilder.js";
import { MetaAccountRepository } from "../../meta/account/repositories/meta-account.repository.js";
import { IntegrationCredentialRepository } from "../repositories/integration-credential.repository.js";
import { IntegrationRepository } from "../repositories/integration.repository.js";
import {
  TConnectedFacebookPage,
  TFacebookInsightMetric,
  TFacebookInsights,
  TFacebookLead,
  TFacebookLeadForm,
  TFacebookPost,
  TGraphError,
  TGraphInsightMetric,
  TGraphLeadForm,
  TGraphPost,
  TMetaPageQuery,
  TMetaPaginatedResponse,
} from "../types/index.js";
import { getActiveFacebookPage } from "../utils/meta-account.utils.js";

export class MetaPageService {
  constructor(
    private metaClient = new MetaClient(),
    private integrationRepo = new IntegrationRepository(),
    private credentialRepo = new IntegrationCredentialRepository(),
    private metaRepo = new MetaAccountRepository(),
    private leadRepo = new LeadRespository(),
  ) {}

  async getPosts(
    accountId: string,
    query: TMetaPageQuery = {},
  ): Promise<TMetaPaginatedResponse<TFacebookPost>> {
    const context = await this.resolveConnectedPage(accountId);
    const { page, limit, offset } = this.resolvePageQuery(query, 12);

    const response = await this.metaClient.getPagePosts(
      context.pageId,
      context.accessToken,
      { limit, offset },
    );

    const docs = (response.data ?? []).map((post: TGraphPost) => this.mapPost(post));

    return {
      docs,
      pagination: this.buildGraphPagination(
        page,
        limit,
        docs.length,
        Boolean(response.paging?.next),
      ),
      warning: this.graphWarning(response.error, "posts"),
    };
  }

  async getLeadForms(
    accountId: string,
    query: TMetaPageQuery = {},
  ): Promise<TMetaPaginatedResponse<TFacebookLeadForm>> {
    const context = await this.resolveConnectedPage(accountId);
    const { page, limit, offset } = this.resolvePageQuery(query, 25);

    const response = await this.metaClient.getLeadgenForms(
      context.pageId,
      context.accessToken,
      { limit, offset },
    );

    const docs = (response.data ?? []).map((form: TGraphLeadForm) =>
      this.mapLeadForm(form),
    );

    return {
      docs,
      pagination: this.buildGraphPagination(
        page,
        limit,
        docs.length,
        Boolean(response.paging?.next),
      ),
      warning: this.graphWarning(response.error, "lead-forms"),
    };
  }

  async getLeads(
    accountId: string,
    query: TMetaPageQuery = {},
  ): Promise<TMetaPaginatedResponse<TFacebookLead>> {
    const context = await this.resolveConnectedPage(accountId);
    const { page, limit, skip } = this.resolvePageQuery(query, 20);

    const { docs, totalDocs } = await this.leadRepo.findFacebookLeads({
      accountId,
      pageId: context.pageId,
      search: query.search,
      limit,
      skip,
    });

    return {
      docs: docs.map((lead) => this.mapLead(lead)),
      pagination: this.buildGraphPagination(
        page,
        limit,
        docs.length,
        Boolean(totalDocs > skip + limit),
      ),
      warning: null,
    };
  }

  async getInsights(
    accountId: string,
  ): Promise<TApiResponse<TFacebookInsights>> {
    const context = await this.resolveConnectedPage(accountId);
    const [snapshot, insights] = await Promise.all([
      this.metaClient.getPageSnapshot(context.pageId, context.accessToken),
      this.metaClient.getPageInsights(context.pageId, context.accessToken),
    ]);

    const warning =
      this.graphWarning(snapshot.error, "insights") ||
      this.graphWarning(insights.error, "insights");

    return {
      doc: {
        page: {
          id: snapshot.data?.id ?? context.pageId,
          name: snapshot.data?.name ?? context.pageName,
          fanCount: snapshot.data?.fan_count ?? null,
          followersCount: snapshot.data?.followers_count ?? null,
          talkingAboutCount: snapshot.data?.talking_about_count ?? null,
          ratingCount: snapshot.data?.rating_count ?? null,
          overallStarRating: snapshot.data?.overall_star_rating ?? null,
        } satisfies TFacebookInsights["page"],
        metrics: ((insights.data ?? []) as TGraphInsightMetric[]).map((metric) =>
          this.mapInsightMetric(metric),
        ),
        warning,
      },
    };
  }

  private mapPost(post: TGraphPost): TFacebookPost {
    return {
      id: String(post.id),
      message: post.message ?? null,
      story: post.story ?? null,
      createdTime: post.created_time ?? null,
      permalink: post.permalink_url ?? null,
      picture: post.full_picture ?? null,
      type: post.status_type ?? null,
      likes: Number(
        post.reactions?.summary?.total_count ??
          post.likes?.summary?.total_count ??
          0,
      ),
      comments: Number(post.comments?.summary?.total_count ?? 0),
      shares: Number(post.shares?.count ?? 0),
      isPublished: post.is_published !== false,
    };
  }

  private mapLeadForm(form: TGraphLeadForm): TFacebookLeadForm {
    return {
      id: String(form.id),
      name: form.name ?? "Untitled form",
      status: form.status ?? null,
      leadsCount: Number(form.leads_count ?? 0),
      createdTime: form.created_time ?? null,
      locale: form.locale ?? null,
      questions: Array.isArray(form.questions)
        ? form.questions.map((question) => ({
            key: question.key,
            label: question.label,
            type: question.type,
          }))
        : [],
    };
  }

  private mapLead(lead: {
    _id?: unknown;
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    mobile?: unknown;
    message?: unknown;
    status?: unknown;
    stage?: unknown;
    createdAt?: unknown;
    source?: unknown;
  }): TFacebookLead {
    const source =
      lead.source && typeof lead.source === "object"
        ? (lead.source as Record<string, unknown>)
        : null;

    return {
      id: lead._id ? String(lead._id) : undefined,
      _id: lead._id ? String(lead._id) : undefined,
      name: this.asOptionalText(lead.name),
      email: this.asOptionalText(lead.email),
      phone: this.asOptionalText(lead.phone),
      mobile: this.asOptionalText(lead.mobile),
      message: this.asOptionalText(lead.message),
      status: this.asOptionalText(lead.status),
      stage: this.asOptionalText(lead.stage),
      createdAt: lead.createdAt ? String(lead.createdAt) : undefined,
      source: source
        ? {
            name: this.asOptionalText(source.name),
            formId: this.asOptionalText(source.formId),
            pageId: this.asOptionalText(source.pageId),
            leadgenId: this.asOptionalText(source.leadgenId),
            adId: this.asOptionalText(source.adId),
            campaignId: this.asOptionalText(source.campaignId),
            createdTime: source.createdTime ? String(source.createdTime) : null,
          }
        : undefined,
    };
  }

  private mapInsightMetric(metric: TGraphInsightMetric): TFacebookInsightMetric {
    const latest = Array.isArray(metric.values)
      ? metric.values[metric.values.length - 1]
      : undefined;
    const rawValue = latest?.value;
    const value =
      rawValue && typeof rawValue === "object"
        ? Object.values(rawValue)[0] ?? null
        : rawValue ?? null;

    return {
      name: metric.name ?? "",
      title: metric.title || metric.name || "",
      value,
      period: metric.period ?? null,
      endTime: latest?.end_time ?? null,
    };
  }

  private async resolveConnectedPage(
    accountId: string,
  ): Promise<TConnectedFacebookPage> {
    const integration = await this.integrationRepo.findByAccountAndProvider(
      accountId,
      IntegrationProvider.FACEBOOK,
    );

    if (!integration) {
      throw HttpError.notFound("Facebook integration is not connected");
    }

    const [credential, metaAccount] = await Promise.all([
      this.credentialRepo.findByIntegrationId(String(integration._id)),
      this.metaRepo.findByIntegrationId(String(integration._id)),
    ]);

    const activePage = getActiveFacebookPage(metaAccount);
    const pageAccessToken =
      activePage?.accessToken || credential?.accessToken;

    if (!activePage?.id || !pageAccessToken) {
      throw HttpError.notFound("Facebook Page is not connected");
    }

    return {
      pageId: activePage.id,
      pageName: activePage.name ?? null,
      accessToken: pageAccessToken,
    };
  }

  private resolvePageQuery(query: TMetaPageQuery, defaultLimit: number) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), 100);
    const offset = (page - 1) * limit;

    return {
      page,
      limit,
      offset,
      skip: offset,
    };
  }

  private buildGraphPagination(
    page: number,
    limit: number,
    docsCount: number,
    hasMore: boolean,
  ) {
    const skip = (page - 1) * limit;
    const totalDocs = hasMore ? skip + docsCount + 1 : skip + docsCount;

    return buildPagination({
      page,
      limit,
      docsCount,
      totalDocs,
    });
  }

  private asOptionalText(value: unknown) {
    if (value == null) return undefined;
    return String(value);
  }

  private graphWarning(error: TGraphError, surface: string) {
    if (!error?.message) return null;

    const message = String(error.message);

    if (message.includes("pages_read_engagement")) {
      return `Facebook did not grant pages_read_engagement, so ${surface} cannot be loaded. Add it to the Login Configuration and reconnect.`;
    }

    if (
      message.includes("leads_retrieval") ||
      message.includes("pages_manage_ads")
    ) {
      return `Facebook did not grant lead form permissions, so ${surface} cannot be loaded. Add leads_retrieval to the Login Configuration and reconnect.`;
    }

    if (message.includes("read_insights")) {
      return `Facebook did not grant read_insights, so Page insights cannot be loaded.`;
    }

    return message;
  }
}
