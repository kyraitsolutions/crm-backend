// analytics.types.ts

export type SourceCount = {
    source: string;
    count: number;
    trend?: number;
    color?: string;
};

export type StatusCount = {
    status: string;
    count: number;
    percentage?: number;
};

export type LeadsOverTimeItem = {
    date: string; // YYYY-MM-DD
    chatbot?: number;
    website?: number;
    googleAds?: number;
    whatsapp?: number;
    facebook?: number;
    instagram?: number;
    webform?: number;
    manual?: number;
    total: number;
};

export type HourlyEngagementItem = { hour: string; engagements: number };
export type WeeklyEngagementItem = { week: string; leads: number; conversions: number };
export type MonthlyEngagementItem = { month: string; leads: number; conversions: number; revenue?: number };

export type RecentLead = { name: string; source: string; status: string; date: string; time: string };

export type ChannelPerformanceItem = {
    channel: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    status?: string;
};

export type AnalyticsData = {
    totalLeads: number;
    todayLeads: number;
    weeklyLeads: number;
    monthlyLeads: number;
    conversionRate: number;
    avgResponseTime?: number;
    activeChatbots: number;
    activeWebforms: number;
    activeGoogleAds: number;
    activeSocialMedia: number;

    leadsBySource: SourceCount[];
    leadsByStatus: StatusCount[];
    leadsOverTime: LeadsOverTimeItem[];
    hourlyEngagement: HourlyEngagementItem[];
    weeklyEngagement: WeeklyEngagementItem[];
    monthlyEngagement: MonthlyEngagementItem[];
    recentLeads: RecentLead[];
    channelPerformance: ChannelPerformanceItem[];
};
