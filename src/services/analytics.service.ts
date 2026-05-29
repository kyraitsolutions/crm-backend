import { Types } from "mongoose";
import { ContactModel } from "../models/contact.model.js";
import { LeadModel } from "../models/lead.model.js";
// analytics.service.ts

import AnalyticsRepository from "../repositories/analytics.repository.js";
import {
  getDateRange,
  getPreviousDateRange,
} from "../utils/analytics-date.util.js";

export default class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  // Main entry point
  async getDashboardAnalytics({
    accountId,
    filters,
  }: {
    accountId: string;
    filters: {
      module?: string;
      range?: string;
      startDate?: string;
      endDate?: string;
    };
  }) {
    const module = filters.module?.toLowerCase() || "overview";

    switch (module) {
      case "whatsapp":
        break;

      case "crm":
      case "leads":
        return this.getCrmDashboardOverview({
          accountId,
          filters,
        });

      case "chatbot":
        // return this.getChatbotDashboard({
        //   accountId,
        //   filters,
        // });
        break;

      case "overview":
      default:
        return this.getOverviewDashboard({
          accountId,
          filters,
        });
    }
  }

  // All Analytics Dashboard
  async getOverviewDashboard({
    accountId,
    filters,
  }: {
    accountId: string;
    filters: {
      module?: string;
      range?: string;
      startDate?: string;
      endDate?: string;
    };
  }) {
    const module = (filters?.module || "overview").toLowerCase();
    const dateRange = getDateRange(filters);

    const [
      leadsSummary,
      conversationSummary,
      conversionSummary,
      recentLeads,
      recentConversations,
      performanceOverview,
      crmSnapshot,
      chatbotSnapshot,
    ] = await Promise.all([
      this.getTotalLeadsSummary(accountId, module, dateRange),
      this.getConversionLeadsSummary(accountId, module, dateRange),
      this.getConversationSummary(accountId, module, dateRange),
      this.getRecentLeads(accountId, module), // NEW
      this.getRecentConversations(accountId, module),
      this.getPerformanceOverview(accountId, module, dateRange),
      this.getCrmSnapshot(accountId, dateRange),
      this.getChatbotSnapshot(accountId, dateRange),
    ]);

    return {
      filters: {
        module,
        range: filters.range || "7days",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },

      summary: [leadsSummary, conversationSummary, conversionSummary],
      recentLeads,
      recentConversations,
      performanceOverview,
      snapshots: [crmSnapshot, chatbotSnapshot],
    };
  }

  // All CRM OR Leads Analytics Dashboard
  async getCrmDashboardOverview({
    accountId,
    filters,
  }: {
    accountId: string;
    filters: {
      module?: string;
      range?: string;
      startDate?: string;
      endDate?: string;
    };
  }) {
    const module = "leads";
    const dateRange = getDateRange(filters);

    const [
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      openLeads,
      conversionRate,
      leadsBySource,
      leadsByStatus,
      leadsOverTime,
      recentLeads,
    ] = await Promise.all([
      this.getTotalLeadsSummary(accountId, module, dateRange),
      this.getQualifiedLeadsSummary(accountId, module, dateRange),
      this.getConvertedLeadsSummary(accountId, module, dateRange),
      this.getOpenLeadsSummary(accountId, module, dateRange),
      this.getConversionLeadsSummary(accountId, module, dateRange),
      this.getLeadsBySource(accountId, dateRange),
      this.getLeadsByStatus(accountId, dateRange),
      this.getLeadsOverTime(accountId, dateRange),
      this.getRecentLeads(accountId, module),
    ]);

    return {
      filters: {
        module,
        range: filters.range || "7days",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      },
      summary: [
        totalLeads,
        convertedLeads,
        conversionRate,
        qualifiedLeads,
        openLeads,
      ],
      charts: {
        leadsBySource,
        leadsOverTime,
        leadsByStatus,
      },
      recentLeads,
    };
  }

  // Shared Helpers
  private calculatePercentage(current: number, previous: number) {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private async buildAnalyticsSummary({
    id,
    title,
    currentHandler,
    previousHandler,
    trendHandler,
  }: {
    id: string;
    title: string;

    currentHandler: () => Promise<number>;
    previousHandler: () => Promise<number>;
    trendHandler: () => Promise<number[]>;
  }) {
    const [current, previous, chartData] = await Promise.all([
      currentHandler(),
      previousHandler(),
      trendHandler(),
    ]);

    const percentage = this.calculatePercentage(current, previous);

    return {
      id,
      title,
      value: current,
      percentage,
      trendDirection: percentage >= 0 ? "up" : "down",
      chartData,
    };
  }

  // Leads Summary Analytics
  private async getTotalLeadsSummary(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    const current = await this.analyticsRepository.countLeads({
      accountId,
      module,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const previousRange = getPreviousDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const previous = await this.analyticsRepository.countLeads({
      accountId,
      module,
      startDate: previousRange.previousStart,
      endDate: previousRange.previousEnd,
    });

    const percentage = this.calculatePercentage(current, previous);

    const trend = await this.analyticsRepository.getLeadTrend({
      accountId,
      module,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    return {
      id: "new_leads",
      title: "New Leads",
      value: current,
      percentage,
      trendDirection: percentage >= 0 ? "up" : "down",
      chartData: trend,
    };
  }

  private async getQualifiedLeadsSummary(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return this.buildLeadStageSummary({
      accountId,
      stage: "qualified",
      title: "Qualified Leads",
      id: "qualified_leads",
      dateRange,
    });
  }

  private async getConvertedLeadsSummary(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return this.buildLeadStageSummary({
      accountId,
      stage: "converted",
      title: "Converted Leads",
      id: "converted_leads",
      dateRange,
    });
  }

  private async getOpenLeadsSummary(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return this.buildLeadStageSummary({
      accountId,
      stage: "open",
      title: "Open Leads",
      id: "open_leads",
      dateRange,
    });
  }

  private async getConversionLeadsSummary(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    const current = await this.analyticsRepository.getConversionRate({
      accountId,
      module,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const previousRange = getPreviousDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const previous = await this.analyticsRepository.getConversionRate({
      accountId,

      module,

      startDate: previousRange.previousStart,

      endDate: previousRange.previousEnd,
    });

    const percentage = this.calculatePercentage(current, previous);

    const trend = await this.analyticsRepository.getConversionTrend({
      accountId,

      module,

      startDate: dateRange.startDate,

      endDate: dateRange.endDate,
    });

    return {
      id: "conversion_rate",
      title: "Conversion Rate",
      value: current,
      percentage,
      trendDirection: percentage >= 0 ? "up" : "down",
      chartData: trend,
    };
  }

  private async buildLeadStageSummary({
    accountId,
    stage,
    title,
    id,
    dateRange,
  }: {
    accountId: string;
    stage: string;
    title: string;
    id: string;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  }) {
    const previousRange = getPreviousDateRange(dateRange);

    return this.buildAnalyticsSummary({
      id,
      title,
      currentHandler: () =>
        this.analyticsRepository.countLeadsByStage({
          accountId,
          stage,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),

      previousHandler: () =>
        this.analyticsRepository.countLeadsByStage({
          accountId,
          stage,
          startDate: previousRange.previousStart,
          endDate: previousRange.previousEnd,
        }),

      trendHandler: () =>
        this.analyticsRepository.getLeadStageTrend({
          accountId,
          stage,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
    });
  }

  // Leads Chart Analytics
  private async getLeadsBySource(
    accountId: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return await this.analyticsRepository.getLeadSourceAnalytics({
      accountId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }

  private async getLeadsByStatus(
    accountId: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return await this.analyticsRepository.getLeadStatusAnalytics({
      accountId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }

  private async getLeadsOverTime(
    accountId: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return await this.analyticsRepository.getLeadTrend({
      accountId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }

  // Conversation Analytics
  private async getConversationSummary(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    const current = await this.analyticsRepository.countOpenConversations({
      accountId,
      module,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const previousRange = getPreviousDateRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    const previous = await this.analyticsRepository.countOpenConversations({
      accountId,
      module,
      startDate: previousRange.previousStart,
      endDate: previousRange.previousEnd,
    });

    const percentage = this.calculatePercentage(current, previous);

    const trend = await this.analyticsRepository.getConversationTrend({
      accountId,
      // module,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    return {
      id: "open_conversations",
      title: "Open Conversations",
      value: current,
      percentage,
      trendDirection: percentage >= 0 ? "up" : "down",
      chartData: trend,
    };
  }

  // Recent Activity
  private async getRecentLeads(accountId: string, module: string) {
    const leads = await this.analyticsRepository.getRecentLeads({
      accountId,
      // module,
      limit: 5,
    });

    return leads.map((lead: any) => ({
      name: lead.name,
      source: lead.source?.name || "Unknown",
      phone: lead.phone,
      status: lead.stage || "New",
      createdAt: lead.createdAt,
    }));
  }

  private async getRecentConversations(accountId: string, module: string) {
    const conversations = await this.analyticsRepository.getRecentConversations(
      {
        accountId,
        module,
        limit: 5,
      },
    );

    return conversations.map((conv: any) => ({
      contact: conv.contact?.name || conv.contact?.phone || conv.visitorId,
      platform: conv.platform,
      lastMessage: conv.lastMessage || "",
      status: conv.status,
      createdAt: conv.createdAt,
    }));
  }

  // Performance Analytics
  private async getPerformanceOverview(
    accountId: string,
    module: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    return this.analyticsRepository.getPerformanceOverviewTrend({
      accountId,
      module,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  }

  // Snapshot Analytics
  private async getCrmSnapshot(
    accountId: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    const [totalLeads, qualifiedLeads, convertedLeads, conversionRate] =
      await Promise.all([
        this.analyticsRepository.countLeads({
          accountId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),

        this.analyticsRepository.countLeadsByStage({
          accountId,
          stage: "qualified",
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),

        this.analyticsRepository.countLeadsByStage({
          accountId,
          stage: "converted",
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),

        this.analyticsRepository.getConversionRate({
          accountId,
          module: "leads",
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
      ]);

    return {
      id: "crm",
      title: "CRM Snapshot",
      metrics: [
        {
          label: "Total Leads",
          value: totalLeads,
        },
        {
          label: "Qualified Leads",
          value: qualifiedLeads,
        },
        {
          label: "Converted Leads",
          value: convertedLeads,
        },
        {
          label: "Conversion Rate",
          value: `${conversionRate}%`,
        },
      ],
      action: {
        label: "View CRM Analytics",
        module: "leads",
      },
    };
  }

  private async getChatbotSnapshot(
    accountId: string,
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
  ) {
    const [activeBots, totalInteractions] = await Promise.all([
      this.analyticsRepository.countActiveBots({
        accountId,
      }),

      this.analyticsRepository.countBotInteractions({
        accountId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
    ]);

    // const successRate =
    //   totalInteractions === 0
    //     ? 0
    //     : Number(
    //         ((successfulInteractions / totalInteractions) * 100).toFixed(1),
    //       );

    return {
      id: "chatbot",
      title: "Chatbot Snapshot",

      metrics: [
        {
          label: "Active Bots",
          value: activeBots,
        },
        {
          label: "Interactions",
          value: totalInteractions,
        },
      ],

      action: {
        label: "View Chatbot Analytics",
        module: "chatbot",
      },
    };
  }

  async getSearch(accountId: string, query: any) {


    const search =typeof query ==="string"
      ? query.trim()
      : query?.search?.trim() ||"";

    if (!search)
        return [];

    const regex = new RegExp(search, "i");


    const objectAccountId =new Types.ObjectId(accountId);
    const queryToSearch = {
      accountId: objectAccountId,
      $or: [
        {
          name: {
            $regex: regex,
          },
        },
        {
          email: {
            $regex: regex,
          },
        },
        {
          phone: {
            $regex: regex,
          },
        },
      ],
    };
  const [leads, contacts] = await Promise.all([
    LeadModel.find(queryToSearch).limit(5).lean(),
    ContactModel.find(queryToSearch).limit(5).lean(),
  ]);

    // console.log("Leads",leads,contacts)

    return {
      leads,
      contacts,
    };
  }

}

// import AnalyticsRepository from "../repositories/analytics.repository.js";

// export default class AnalyticsService {
//   private analyticsRepository: AnalyticsRepository;

//   constructor() {
//     this.analyticsRepository = new AnalyticsRepository();
//   }

//   // async getFullAnalytics(
//   //   _user: any,
//   //   accountId: string,
//   //   _query: any,
//   // ): Promise<AnalyticsData> {
//   //   const range = _query.range;

//   //   // You can parse query params (range, timezone) here. For now, we'll compute defaults:
//   //   const now = new Date();
//   //   const startOfToday = new Date(
//   //     now.getFullYear(),
//   //     now.getMonth(),
//   //     now.getDate(),
//   //   );
//   //   const startOfWeek = new Date(startOfToday);
//   //   startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start
//   //   const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

//   //   // call repository
//   //   const [
//   //     totalLeads,
//   //     todayLeads,
//   //     weeklyLeads,
//   //     monthlyLeads,
//   //     leadsBySource,
//   //     leadsByStatus,
//   //     leadsOverTime,
//   //     hourlyEngagement,
//   //     weeklyEngagement,
//   //     monthlyEngagement,
//   //     recentLeads,
//   //     channelPerformance,
//   //     activeCounts,
//   //     conversionRate,
//   //   ] = await Promise.all([
//   //     this.analyticsRepository.countLeads(accountId, {}),
//   //     this.analyticsRepository.countLeads(accountId, {
//   //       createdAfter: startOfToday,
//   //     }),
//   //     this.analyticsRepository.countLeads(accountId, {
//   //       createdAfter: startOfWeek,
//   //     }),
//   //     this.analyticsRepository.countLeads(accountId, {
//   //       createdAfter: startOfMonth,
//   //     }),
//   //     this.analyticsRepository.leadsBySource(accountId, { days: 30 }),
//   //     this.analyticsRepository.leadsByStatus(accountId),
//   //     this.analyticsRepository.leadsOverTime(accountId, { days: 7 }),
//   //     this.analyticsRepository.hourlyEngagement(accountId, {
//   //       date: startOfToday,
//   //     }),
//   //     this.analyticsRepository.weeklyEngagement(accountId, { weeks: 4 }),
//   //     this.analyticsRepository.monthlyEngagement(accountId, { months: 6 }),
//   //     this.analyticsRepository.recentLeads(accountId, { limit: 10 }),
//   //     this.analyticsRepository.channelPerformance(accountId),
//   //     this.analyticsRepository.activeCounts(accountId),
//   //     this.analyticsRepository.overallConversionRate(accountId),
//   //   ]);

//   //   const avgResponseTime = 3.2; // placeholder — implement from conversations/timestamps if you have them

//   //   const analytics: AnalyticsData = {
//   //     totalLeads,
//   //     todayLeads,
//   //     weeklyLeads,
//   //     monthlyLeads,
//   //     conversionRate: conversionRate ?? 0,
//   //     avgResponseTime,
//   //     activeChatbots: activeCounts.chatbots,
//   //     activeWebforms: activeCounts.webforms,
//   //     activeGoogleAds: activeCounts.googleAds,
//   //     activeSocialMedia: activeCounts.social,
//   //     leadsBySource,
//   //     leadsByStatus,
//   //     leadsOverTime,
//   //     hourlyEngagement,
//   //     weeklyEngagement,
//   //     monthlyEngagement,
//   //     recentLeads,
//   //     channelPerformance,
//   //   };

//   //   return analytics;
//   // }

//   async getFullAnalyticsDashboard({
//     accountId,
//     query,
//   }: {
//     accountId: string;
//     query: AnalyticsQuery;
//   }) {
//     const dateRange = AnalyticsDateService.getDateRange(query);

//     const module = query.module || "all";

//     const [leadsCard, conversationsCard, conversionCard] = await Promise.all([
//       this.getLeadsCard(accountId, module, dateRange),
//       this.getConversationCard(accountId, module, dateRange),
//       this.getConversionCard(accountId, module, dateRange),
//     ]);

//     return {
//       filters: {
//         module,
//         range: query.range,
//         startDate: dateRange.startDate,
//         endDate: dateRange.endDate,
//       },

//       cards: [leadsCard, conversationsCard, conversionCard],
//     };
//   }
// }
