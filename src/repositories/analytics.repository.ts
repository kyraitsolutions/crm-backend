// analytics.repo.ts
import { ObjectId } from "mongodb";
import { SourceCount, StatusCount, LeadsOverTimeItem, HourlyEngagementItem, WeeklyEngagementItem, MonthlyEngagementItem, RecentLead, ChannelPerformanceItem } from "../types/analytics.type";
import { LeadModel } from "../models/lead.model.js";
import { ChatbotModel } from "../models/chatbot.model.js";
import { FormModel } from "../models/form.model.js";
import { PipelineStage } from "mongoose";

/**
 * NOTE:
 * - Assumes LeadModel collection name is 'leads'
 * - Lead.source.name holds e.g. 'Chatbot', 'Website', 'Google Ads', 'WhatsApp', etc.
 * - Lead.chatbotId / formId exist where applicable.
 * - Adjust field names if your model differs.
 */
export default class AnalyticsRepository {
  // Generic lead count with optional filters
  async countLeads(accountId: string, opts: { createdAfter?: Date; createdBefore?: Date } = {}): Promise<number> {
    const q: any = { accountId: new ObjectId(accountId) };
    if (opts.createdAfter) q.createdAt = { ...(q.createdAt ?? {}), $gte: opts.createdAfter };
    if (opts.createdBefore) q.createdAt = { ...(q.createdAt ?? {}), $lte: opts.createdBefore };
    return LeadModel.countDocuments(q).exec();
  }

  async leadsBySource(accountId: string, opts: { days?: number } = {}): Promise<SourceCount[]> {
    const match: any = { accountId: new ObjectId(accountId) };
    if (opts.days) {
      const from = new Date();
      from.setDate(from.getDate() - opts.days);
      match.createdAt = { $gte: from };
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: "$source.name",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          source: { $ifNull: ["$_id", "Unknown"] },
          count: 1,
        },
      },
    ];

    const raw: Array<{ source: string; count: number }> = await LeadModel.aggregate(pipeline).exec();

    // compute simple trend: compare last 7 days vs previous 7 days (best-effort)
    const trends = await Promise.all(
      raw.map(async (r) => {
        const this7 = await LeadModel.countDocuments({ accountId: new ObjectId(accountId), "source.name": r.source, createdAt: { $gte: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })() } }).exec();
        const prev7 = await LeadModel.countDocuments({ accountId: new ObjectId(accountId), "source.name": r.source, createdAt: { $gte: (() => { const d = new Date(); d.setDate(d.getDate() - 14); return d; })(), $lt: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })() } }).exec();
        const trend = prev7 === 0 ? (this7 === 0 ? 0 : 100) : ((this7 - prev7) / prev7) * 100;
        return { ...r, trend: Math.round(trend * 10) / 10 };
      })
    );

    // map colors optionally — adjust mapping as desired
    const colorMap: Record<string, string> = {
      Chatbot: "#3B82F6",
      Website: "#10B981",
      "Google Ads": "#F59E0B",
      WhatsApp: "#22C55E",
      Facebook: "#3B5998",
      Instagram: "#E4405F",
      Webform: "#8B5CF6",
      Manual: "#6B7280",
    };

    return trends.map((t) => ({ source: t.source, count: t.count, trend: t.trend, color: colorMap[t.source] ?? "#9CA3AF" }));
  }

  async leadsByStatus(accountId: string): Promise<StatusCount[]> {
    const pipeline = [
      { $match: { accountId: new ObjectId(accountId) } },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: { $ifNull: ["$_id", "Unknown"] },
          count: 1,
        },
      },
    ];

    const raw = await LeadModel.aggregate(pipeline).exec();
    const total = raw.reduce((s, r) => s + r.count, 0) || 1;
    return raw.map((r: any) => ({ status: r.status, count: r.count, percentage: Math.round((r.count / total) * 1000) / 10 }));
  }

  async leadsOverTime(accountId: string, opts: { days?: number } = {}): Promise<LeadsOverTimeItem[]> {
    const days = opts.days ?? 7;

    // In IST 
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const end = new Date(istNow);

    // In UTC
    // const end = new Date();



    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    const pipeline: PipelineStage[] = [
      { $match: { accountId: new ObjectId(accountId), createdAt: { $gte: start, $lte: end } } },
      {
        $addFields: {
          dateStr: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
      },
      {
        $group: {
          _id: { date: "$dateStr", source: "$source.name" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          sources: {
            $push: { k: "$_id.source", v: "$count" },
          },
          total: { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          sources: 1,
          total: 1,
        },
      },
    ];

    const raw = await LeadModel.aggregate(pipeline).exec();

    // Build full result with fixed keys
    const dates: string[] = [];
    // for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    //     dates.push(d.toISOString().slice(0, 10));
    // }
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      dates.push(`${yyyy}-${mm}-${dd}`);
    }

    const mapped = dates.map((date) => {
      const entry = raw.find((r: any) => r.date === date);
      const obj: any = {
        date,
        chatbot: 0,
        website: 0,
        googleAds: 0,
        whatsapp: 0,
        facebook: 0,
        instagram: 0,
        webform: 0,
        manual: 0,
        total: entry ? entry.total : 0,
      };
      if (entry) {
        (entry.sources || []).forEach((s: any) => {
          // const key = (s.k || "Unknown").toString().toLowerCase().replace(" ", "");
          // map to fields
          if (/chatbot/i.test(s.k)) obj.chatbot = s.v;
          else if (/website/i.test(s.k)) obj.website = s.v;
          else if (/google/i.test(s.k)) obj.googleAds = s.v;
          else if (/whatsapp/i.test(s.k)) obj.whatsapp = s.v;
          else if (/facebook/i.test(s.k)) obj.facebook = s.v;
          else if (/instagram/i.test(s.k)) obj.instagram = s.v;
          else if (/webform/i.test(s.k)) obj.webform = s.v;
          else if (/manual/i.test(s.k)) obj.manual = s.v;
          else obj[s.k] = s.v;
        });
      }
      return obj;
    });

    return mapped;
  }

  async hourlyEngagement(accountId: string, opts: { date?: Date } = {}): Promise<HourlyEngagementItem[]> {
    const date = opts.date ?? new Date();
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    // Count leads by hour
    const pipeline: PipelineStage[] = [
      { $match: { accountId: new ObjectId(accountId), createdAt: { $gte: start, $lt: end } } },
      {
        $addFields: {
          hour: { $dateToString: { format: "%H:00", date: "$createdAt" } },
        },
      },
      {
        $group: {
          _id: "$hour",
          engagements: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, hour: "$_id", engagements: 1 } },
    ];

    const raw = await LeadModel.aggregate(pipeline).exec();

    // Map to fixed buckets every 3 hours (as in dummy), but return existing hours if different
    const buckets = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
    const map = new Map(raw.map((r: any) => [r.hour, r.engagements]));
    return buckets.map((h) => ({ hour: h, engagements: map.get(h) ?? 0 }));
  }

  async weeklyEngagement(accountId: string, opts: { weeks?: number } = {}): Promise<WeeklyEngagementItem[]> {
    const weeks = opts.weeks ?? 4;
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - weeks * 7);
    start.setHours(0, 0, 0, 0);

    // We'll compute weekly buckets (mon-sun)
    const pipeline: PipelineStage[] = [
      { $match: { accountId: new ObjectId(accountId), createdAt: { $gte: start } } },
      {
        $addFields: {
          weekStart: {
            $dateToString: { format: "%Y-%m-%d", date: { $dateFromParts: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $subtract: [{ $dayOfMonth: "$createdAt" }, { $mod: [{ $dayOfWeek: "$createdAt" }, 7] }] } } } },
          },
        },
      },
      {
        $group: {
          _id: "$weekStart",
          leads: { $sum: 1 },
          conversions: { $sum: { $cond: [{ $eq: ["$stage", "converted"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, week: "$_id", leads: 1, conversions: 1 } },
    ];

    const raw = await LeadModel.aggregate(pipeline).exec();
    // If needed, pad to weeks count
    return raw.slice(-weeks).map((r: any, idx: number) => ({ week: `Week ${idx + 1}`, leads: r.leads, conversions: r.conversions }));
  }

  async monthlyEngagement(accountId: string, opts: { months?: number } = {}): Promise<MonthlyEngagementItem[]> {
    const months = opts.months ?? 6;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const pipeline: PipelineStage[] = [
      { $match: { accountId: new ObjectId(accountId), createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          leads: { $sum: 1 },
          conversions: { $sum: { $cond: [{ $eq: ["$stage", "converted"] }, 1, 0] } },
        },
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          leads: 1,
          conversions: 1,
          _id: 0,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ];

    const raw = await LeadModel.aggregate(pipeline).exec();

    // Map month number to short names
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return raw.map((r: any) => ({ month: monthNames[r.month - 1], leads: r.leads, conversions: r.conversions, revenue: 0 }));
  }

  async recentLeads(accountId: string, opts: { limit?: number } = {}): Promise<RecentLead[]> {
    const limit = opts.limit ?? 10;
    const items = await LeadModel.find({ accountId: new ObjectId(accountId) }).sort({ createdAt: -1 }).limit(limit).lean().exec();
    return items.map((l: any) => ({
      name: l.name || `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || "Unknown",
      source: l.source?.name ?? "Unknown",
      status: l.stage ?? "intake",
      date: l.createdAt ? new Date(l.createdAt).toISOString().slice(0, 10) : "",
      time: l.createdAt ? new Date(l.createdAt).toTimeString().slice(0, 5) : "",
    }));
  }

  async channelPerformance(accountId: string): Promise<ChannelPerformanceItem[]> {
    // For each major channel compute leads, conversions and conversion rate
    const channels = ["chatbot", "website", "google_ads", "whatsapp", "facebook", "instagram", "webform", "manual"]
    const pipeline = [
      { $match: { accountId: new ObjectId(accountId) } },
      {
        $group: {
          _id: "$source.name",
          leads: { $sum: 1 },
          conversions: { $sum: { $cond: [{ $eq: ["$stage", "converted"] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, channel: { $ifNull: ["$_id", "Unknown"] }, leads: 1, conversions: 1 } },
    ];

    const raw = await LeadModel.aggregate(pipeline).exec();

    const map = new Map(raw.map((r: any) => [r.channel, r]));
    const result = channels.map((c) => {
      const r = map.get(c) ?? { leads: 0, conversions: 0 };
      const conversionRate = r.leads === 0 ? 0 : Math.round((r.conversions / r.leads) * 1000) / 10;
      return { channel: c, leads: r.leads, conversions: r.conversions, conversionRate, status: "active" };
    });

    return result;
  }

  async activeCounts(accountId: string): Promise<{ chatbots: number; webforms: number; googleAds: number; social: number }> {
    const chatbots = await ChatbotModel.countDocuments({ accountId: new ObjectId(accountId), status: true }).exec();
    const webforms = await FormModel.countDocuments({ accountId: new ObjectId(accountId), status: true }).exec();

    // googleAds/social placeholders: depends on how you store Google Ads / social accounts
    const googleAds = 12; // TODO: query your google campaigns collection or integration table
    const social = 6; // TODO: query social integrations table

    return { chatbots, webforms, googleAds, social };
  }

  async overallConversionRate(accountId: string): Promise<number> {
    const pipeline = [
      { $match: { accountId: new ObjectId(accountId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$stage", "converted"] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, total: 1, converted: 1 } },
    ];
    const res = await LeadModel.aggregate(pipeline).exec();
    if (!res || res.length === 0) return 0;
    const { total, converted } = res[0];
    return total === 0 ? 0 : Math.round((converted / total) * 1000) / 10;
  }
}
