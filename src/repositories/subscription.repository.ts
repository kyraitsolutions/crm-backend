import { ClientSession, Types } from "mongoose";
import { Plan, UserSubscription } from "../models/subscription.model.js";
import { OrganizationSubscription } from "../models/organization-subscription.model.js";
import { UsagePeriod } from "../models/usage-period.model.js";
import { SubscriptionAddon } from "../models/subscription-addon.model.js";
import { SubscriptionEvent } from "../models/subscription-event.model.js";
import { BillingProviderEvent } from "../models/billing-provider-event.model.js";
import { SubscriptionPayment } from "../models/subscription-payment.model.js";

export class SubscriptionRepository {
  async findAll(): Promise<any> {
    return Plan.find({ isActive: { $ne: false } });
  }

  async findPublicPlans() {
    return Plan.find({
      isActive: true,
      isPublic: true,
      isTrial: { $ne: true },
    }).sort({ "price.monthly": 1 });
  }

  async findPlanByCode(code: string) {
    return Plan.findOne({ code });
  }

  async findPlanById(planId: string) {
    return Plan.findById(planId);
  }

  async findPlanByName(name: string) {
    return Plan.findOne({ name });
  }

  async create(
    userId: string,
    planId: string,
    session?: ClientSession,
  ): Promise<any> {
    const plan = await Plan.findById(planId).select("durationDays");

    if (!plan) {
      throw new Error("Plan not found");
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + (plan.durationDays || 30));

    const subscription = new UserSubscription({
      userId,
      planId,
      startedAt,
      expiresAt,
      status: "active",
    });
    return session
      ? await subscription.save({ session })
      : await subscription.save();
  }

  async findOrgSubscription(organizationId: string, session?: ClientSession) {
    return OrganizationSubscription.findOne({ organizationId }).session(session || null);
  }

  async createOrgSubscription(payload: Record<string, unknown>, session?: ClientSession) {
    const docs = await OrganizationSubscription.create([payload], { session });
    return docs[0];
  }

  async saveOrgSubscription(doc: any, session?: ClientSession) {
    return doc.save({ session });
  }

  async findUsagePeriod(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return UsagePeriod.findOne({ organizationId, periodStart, periodEnd });
  }

  async upsertUsageIncrement(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
    metric: string,
    quantity: number,
  ) {
    return UsagePeriod.findOneAndUpdate(
      { organizationId, periodStart, periodEnd },
      { $inc: { [`metrics.${metric}`]: quantity } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async findActiveAddon(organizationId: string, addonCode: string) {
    return SubscriptionAddon.findOne({
      organizationId,
      addonCode,
      status: "active",
    });
  }

  async createEvent(payload: Record<string, unknown>, session?: ClientSession) {
    const docs = await SubscriptionEvent.create([payload], { session });
    return docs[0];
  }

  async eventExists(organizationId: string, eventType: string, since?: Date) {
    return SubscriptionEvent.exists({
      organizationId,
      eventType,
      ...(since ? { createdAt: { $gte: since } } : {}),
    });
  }

  async findProviderEvent(eventId: string) {
    return BillingProviderEvent.findOne({ eventId });
  }

  async createProviderEvent(payload: Record<string, unknown>) {
    return BillingProviderEvent.create(payload);
  }

  async upsertPayment(filter: Record<string, unknown>, update: Record<string, unknown>) {
    return SubscriptionPayment.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  async findPaymentByOrderId(razorpayOrderId: string) {
    return SubscriptionPayment.findOne({ razorpayOrderId });
  }

  async findPaymentByPaymentId(razorpayPaymentId: string) {
    return SubscriptionPayment.findOne({ razorpayPaymentId });
  }

  async listPayments(organizationId: string, limit = 50) {
    return SubscriptionPayment.find({ organizationId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async paymentSummary(organizationId?: string) {
    const match = organizationId
      ? { organizationId: new Types.ObjectId(organizationId) }
      : {};

    const [captured] = await SubscriptionPayment.aggregate([
      { $match: { ...match, status: "captured" } },
      {
        $group: {
          _id: "$currency",
          totalAmount: { $sum: "$amount" },
          totalAmountPaise: { $sum: "$amountPaise" },
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = await SubscriptionPayment.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byStatus = Object.fromEntries(
      counts.map((row: { _id: string; count: number }) => [row._id, row.count]),
    );

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [monthCaptured] = await SubscriptionPayment.aggregate([
      {
        $match: {
          ...match,
          status: "captured",
          paidAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: "$currency",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      currency: captured?._id || "INR",
      totalRevenue: captured?.totalAmount || 0,
      capturedCount: captured?.count || 0,
      pendingCount: byStatus.pending || 0,
      failedCount: byStatus.failed || 0,
      thisMonthRevenue: monthCaptured?.totalAmount || 0,
      thisMonthCount: monthCaptured?.count || 0,
    };
  }
}
