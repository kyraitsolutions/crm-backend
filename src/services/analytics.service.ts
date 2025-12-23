import AnalyticsRepository from "../repositories/analytics.repository";
import { AnalyticsData } from "../types/analytics.type";

export default class AnalyticsService {
  private analyticsRepository: AnalyticsRepository;

  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }
  /**
   * user: current user object (for role based filters)
   * accountId: account to fetch analytics for
   * query: optional query params (fromDate/toDate/interval etc.)
   */
  async getFullAnalytics(_user: any, accountId: string, _query: any): Promise<AnalyticsData> {
    // You can parse query params (range, timezone) here. For now, we'll compute defaults:
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // call repository
    const [
      totalLeads,
      todayLeads,
      weeklyLeads,
      monthlyLeads,
      leadsBySource,
      leadsByStatus,
      leadsOverTime,
      hourlyEngagement,
      weeklyEngagement,
      monthlyEngagement,
      recentLeads,
      channelPerformance,
      activeCounts,
      conversionRate,
    ] = await Promise.all([
      this.analyticsRepository.countLeads(accountId, {}),
      this.analyticsRepository.countLeads(accountId, { createdAfter: startOfToday }),
      this.analyticsRepository.countLeads(accountId, { createdAfter: startOfWeek }),
      this.analyticsRepository.countLeads(accountId, { createdAfter: startOfMonth }),
      this.analyticsRepository.leadsBySource(accountId, { days: 30 }),
      this.analyticsRepository.leadsByStatus(accountId),
      this.analyticsRepository.leadsOverTime(accountId, { days: 7 }),
      this.analyticsRepository.hourlyEngagement(accountId, { date: startOfToday }),
      this.analyticsRepository.weeklyEngagement(accountId, { weeks: 4 }),
      this.analyticsRepository.monthlyEngagement(accountId, { months: 6 }),
      this.analyticsRepository.recentLeads(accountId, { limit: 10 }),
      this.analyticsRepository.channelPerformance(accountId),
      this.analyticsRepository.activeCounts(accountId),
      this.analyticsRepository.overallConversionRate(accountId),
    ]);

    const avgResponseTime = 3.2; // placeholder — implement from conversations/timestamps if you have them

    const analytics: AnalyticsData = {
      totalLeads,
      todayLeads,
      weeklyLeads,
      monthlyLeads,
      conversionRate: conversionRate ?? 0,
      avgResponseTime,
      activeChatbots: activeCounts.chatbots,
      activeWebforms: activeCounts.webforms,
      activeGoogleAds: activeCounts.googleAds,
      activeSocialMedia: activeCounts.social,
      leadsBySource,
      leadsByStatus,
      leadsOverTime,
      hourlyEngagement,
      weeklyEngagement,
      monthlyEngagement,
      recentLeads,
      channelPerformance,
    };

    return analytics;
  }
}
