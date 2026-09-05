import crypto from "crypto";
import { ClientSession } from "mongoose";
import { HttpError } from "../utils/http.error.js";
import { SubscriptionRepository } from "../repositories/subscription.repository.js";
import { Plan, UserSubscription } from "../models/subscription.model.js";
import { AccountModel } from "../models/accounts.model.js";
import { ChatbotModel } from "../models/chatbot.model.js";
import { OrganizationMember } from "../models/organizationMember.model.js";
import { WebhookTokenModel } from "../modules/webhook/models/webhookToken.model.js";
import { Organization } from "../models/organization.model.js";
import { razorpay, assertRazorpayConfigured, mapRazorpayError } from "../config/razorpay.js";
import { config } from "../config/index.js";
import logger from "../utils/logger.js";
import {
  ADDON_CODE,
  FEATURE,
  FeatureKey,
  PLAN_CODE,
  PLAN_LIMIT,
  SUBSCRIPTION_ERROR,
  SUBSCRIPTION_EVENT,
  SUBSCRIPTION_STATUS,
  USAGE_METRIC,
  UsageMetric,
} from "../constants/subscription.constant.js";
import {
  addDaysUtc,
  addMonthsUtc,
  daysRemaining,
  isPast,
  utcNow,
} from "../utils/subscription-date.util.js";
import { PlanName, SubscriptionStatus, IUserSubscription } from "../types/core.js";
import { ObjectId } from "mongodb";

const METRIC_TO_LIMIT: Record<string, string> = {
  [USAGE_METRIC.TEAM_MEMBERS]: PLAN_LIMIT.TEAM_MEMBERS,
  [USAGE_METRIC.ACCOUNTS]: PLAN_LIMIT.ACCOUNTS,
  [USAGE_METRIC.CHATBOTS]: PLAN_LIMIT.CHATBOTS,
  [USAGE_METRIC.WEBHOOKS]: PLAN_LIMIT.WEBHOOKS,
  [USAGE_METRIC.LEADS]: PLAN_LIMIT.LEADS_PER_MONTH,
  [USAGE_METRIC.WHATSAPP_MESSAGES]: PLAN_LIMIT.WHATSAPP_MESSAGES_PER_MONTH,
  [USAGE_METRIC.AI_CONVERSATIONS]: PLAN_LIMIT.AI_CONVERSATIONS_PER_MONTH,
};

const METRIC_TO_FEATURE: Partial<Record<string, FeatureKey>> = {
  [USAGE_METRIC.TEAM_MEMBERS]: FEATURE.ACCOUNT_MANAGEMENT,
  [USAGE_METRIC.ACCOUNTS]: FEATURE.ACCOUNT_MANAGEMENT,
  [USAGE_METRIC.CHATBOTS]: FEATURE.CHATBOTS,
  [USAGE_METRIC.WEBHOOKS]: FEATURE.WEBHOOKS,
  [USAGE_METRIC.LEADS]: FEATURE.LEAD_MANAGEMENT,
  [USAGE_METRIC.WHATSAPP_MESSAGES]: FEATURE.WHATSAPP_MESSAGING,
  [USAGE_METRIC.AI_CONVERSATIONS]: FEATURE.WHATSAPP_AI_AGENT,
};

const METRIC_ERROR: Partial<Record<string, string>> = {
  [USAGE_METRIC.TEAM_MEMBERS]: SUBSCRIPTION_ERROR.TEAM_MEMBER_LIMIT_REACHED,
  [USAGE_METRIC.CHATBOTS]: SUBSCRIPTION_ERROR.CHATBOT_LIMIT_REACHED,
  [USAGE_METRIC.WEBHOOKS]: SUBSCRIPTION_ERROR.WEBHOOK_LIMIT_REACHED,
  [USAGE_METRIC.LEADS]: SUBSCRIPTION_ERROR.LEAD_LIMIT_REACHED,
  [USAGE_METRIC.WHATSAPP_MESSAGES]: SUBSCRIPTION_ERROR.WHATSAPP_MESSAGE_LIMIT_REACHED,
  [USAGE_METRIC.AI_CONVERSATIONS]: SUBSCRIPTION_ERROR.AI_USAGE_LIMIT_REACHED,
};

const LIMIT_MESSAGES: Record<string, string> = {
  [SUBSCRIPTION_ERROR.TEAM_MEMBER_LIMIT_REACHED]:
    "You have reached your team member limit. Upgrade your plan to invite more people.",
  [SUBSCRIPTION_ERROR.CHATBOT_LIMIT_REACHED]:
    "You have reached your chatbot limit. Upgrade your plan to create more chatbots.",
  [SUBSCRIPTION_ERROR.WEBHOOK_LIMIT_REACHED]:
    "You have reached your webhook limit. Upgrade your plan to add more webhooks.",
  [SUBSCRIPTION_ERROR.LEAD_LIMIT_REACHED]:
    "Lead limit reached. Upgrade your plan to add more leads.",
  [SUBSCRIPTION_ERROR.WHATSAPP_MESSAGE_LIMIT_REACHED]:
    "WhatsApp message limit reached. Upgrade your plan to continue sending messages.",
  [SUBSCRIPTION_ERROR.AI_USAGE_LIMIT_REACHED]:
    "AI Agent usage limit reached. Upgrade your plan to continue.",
  [SUBSCRIPTION_ERROR.PLAN_LIMIT_REACHED]:
    "You have reached a plan limit. Upgrade your plan to continue.",
};

export class SubscriptionService {
  private subscriptionRepository: SubscriptionRepository;

  constructor() {
    this.subscriptionRepository = new SubscriptionRepository();
  }

  async canCreateAccount(userId: string): Promise<boolean> {
    const sub = await this.getCurrentSubscription(userId);
    if (!sub) return false;

    const plan = await Plan.findById(sub.planId);
    if (!plan) return false;

    const accountCount = await AccountModel.countDocuments({
      createdBy: new ObjectId(userId),
    });

    return accountCount < (plan.maxAccounts ?? 1);
  }

  async getAllSubscriptionPlan(): Promise<any> {
    return this.subscriptionRepository.findPublicPlans();
  }

  async getCurrentSubscription(userId: string): Promise<IUserSubscription | null> {
    const sub = await UserSubscription.findOne({
      userId: new ObjectId(userId),
      status: SubscriptionStatus.ACTIVE,
    }).sort({ expiresAt: -1 });

    if (!sub) return null;

    if (new Date() > sub.expiresAt) {
      sub.status = SubscriptionStatus.EXPIRED;
      await sub.save();
      return null;
    }

    return sub as unknown as IUserSubscription;
  }

  async assignPlan(userId: string, planName: PlanName): Promise<IUserSubscription> {
    const plan = await Plan.findOne({ name: planName });
    if (!plan) throw HttpError.notFound(`Plan ${planName} not found`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (plan.durationDays || 30));

    await UserSubscription.updateMany(
      { userId: new ObjectId(userId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.EXPIRED } },
    );

    const newSub = await UserSubscription.create({
      userId: new ObjectId(userId),
      planId: plan._id,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      expiresAt,
      credits: planName === PlanName.PAYG ? 100 : 0,
    });

    return newSub as unknown as IUserSubscription;
  }

  async initializeDefaultPlan(userId: string): Promise<void> {
    const existing = await UserSubscription.findOne({ userId: new ObjectId(userId) });
    if (!existing) {
      const free =
        (await Plan.findOne({ code: PLAN_CODE.TRIAL })) ||
        (await Plan.findOne({ name: PlanName.FREE })) ||
        (await Plan.findOne({ code: PLAN_CODE.STARTER }));
      if (free) {
        await this.subscriptionRepository.create(userId, String(free._id));
      }
    }
  }

  async createTrialForOrganization(organizationId: string, session?: ClientSession) {
    const existing = await this.subscriptionRepository.findOrgSubscription(
      organizationId,
      session,
    );
    if (existing) return existing;

    const trialPlan = await Plan.findOne({
      $or: [{ code: PLAN_CODE.TRIAL }, { isTrial: true }],
    });

    if (!trialPlan) {
      throw HttpError.internal(
        "Trial plan is not configured",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_REQUIRED,
      );
    }

    const trialDays = trialPlan.trialDays || 14;
    const trialStartAt = utcNow();
    const trialEndAt = addDaysUtc(trialStartAt, trialDays);

    const subscription = await this.subscriptionRepository.createOrgSubscription(
      {
        organizationId,
        planId: trialPlan._id,
        planCode: trialPlan.code || PLAN_CODE.TRIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialStartAt,
        trialEndAt,
        currentPeriodStart: trialStartAt,
        currentPeriodEnd: trialEndAt,
      },
      session,
    );

    await this.subscriptionRepository.createEvent({
      subscriptionId: subscription._id,
      organizationId,
      eventType: SUBSCRIPTION_EVENT.TRIAL_STARTED,
      metadata: { trialStartAt, trialEndAt, trialDays },
    }, session);

    return subscription;
  }

  async getResolvedSubscription(organizationId: string) {
    const subscription =
      await this.subscriptionRepository.findOrgSubscription(organizationId);

    if (!subscription) {
      throw HttpError.paymentRequired(
        "No subscription found for this organization. Please choose a plan.",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_NOT_FOUND,
      );
    }

    const effectiveStatus = this.resolveEffectiveStatus(subscription);
    if (effectiveStatus !== subscription.status) {
      subscription.status = effectiveStatus;
      if (effectiveStatus === SUBSCRIPTION_STATUS.EXPIRED) {
        await this.subscriptionRepository.createEvent({
          subscriptionId: subscription._id,
          organizationId,
          eventType: SUBSCRIPTION_EVENT.TRIAL_EXPIRED,
        }).catch(() => undefined);
      }
      await subscription.save().catch((error) => {
        logger.warn("Failed to persist resolved subscription status", {
          organizationId,
          error: (error as Error).message,
        });
      });
    }

    const plan = await Plan.findById(subscription.planId);
    const addons = await this.subscriptionRepository.findActiveAddon(
      organizationId,
      ADDON_CODE.WHATSAPP_AI_AGENT,
    );

    return { subscription, plan, addons: addons ? [addons] : [] };
  }

  resolveEffectiveStatus(subscription: {
    status: string;
    trialEndAt?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }): string {
    const now = utcNow();

    if (
      subscription.status === SUBSCRIPTION_STATUS.TRIALING &&
      isPast(subscription.trialEndAt, now)
    ) {
      return SUBSCRIPTION_STATUS.EXPIRED;
    }

    if (
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
      subscription.cancelAtPeriodEnd &&
      isPast(subscription.currentPeriodEnd, now)
    ) {
      return SUBSCRIPTION_STATUS.EXPIRED;
    }

    if (
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
      isPast(subscription.currentPeriodEnd, now)
    ) {
      return SUBSCRIPTION_STATUS.PAST_DUE;
    }

    return subscription.status;
  }

  isProductAccessAllowed(status: string): boolean {
    return (
      status === SUBSCRIPTION_STATUS.TRIALING ||
      status === SUBSCRIPTION_STATUS.ACTIVE
    );
  }

  async assertProductAccess(organizationId: string) {
    const { subscription } = await this.getResolvedSubscription(organizationId);
    const status = this.resolveEffectiveStatus(subscription);

    if (status === SUBSCRIPTION_STATUS.EXPIRED) {
      throw HttpError.paymentRequired(
        "Your 14-day free trial has ended. Upgrade your plan to continue using Kyra AI CRM.",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_EXPIRED,
      );
    }

    if (status === SUBSCRIPTION_STATUS.PAST_DUE) {
      throw HttpError.paymentRequired(
        "Your subscription payment is past due. Please update billing to continue.",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_PAST_DUE,
      );
    }

    if (status === SUBSCRIPTION_STATUS.CANCELED && !this.isProductAccessAllowed(status)) {
      throw HttpError.paymentRequired(
        "This feature requires an active subscription.",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_REQUIRED,
      );
    }

    if (!this.isProductAccessAllowed(status)) {
      throw HttpError.paymentRequired(
        "This feature requires an active subscription.",
        undefined,
        SUBSCRIPTION_ERROR.SUBSCRIPTION_REQUIRED,
      );
    }

    return { subscription, status };
  }

  async canAccessFeature(organizationId: string, feature: FeatureKey): Promise<boolean> {
    const { subscription, plan, addons } =
      await this.getResolvedSubscription(organizationId);
    const status = this.resolveEffectiveStatus(subscription);

    if (!this.isProductAccessAllowed(status)) {
      return false;
    }

    const fromPlan = Boolean(plan?.featureMap?.[feature]);
    const fromAddon = addons.some(
      (addon) => addon.addonCode === feature && addon.status === "active",
    );

    return fromPlan || fromAddon;
  }

  async checkFeature(organizationId: string, feature: FeatureKey): Promise<void> {
    await this.assertProductAccess(organizationId);

    const allowed = await this.canAccessFeature(organizationId, feature);
    if (allowed) return;

    if (feature === FEATURE.WHATSAPP_AI_AGENT) {
      throw HttpError.paymentRequired(
        "WhatsApp AI Agent is a premium feature. Upgrade your plan to enable it.",
        undefined,
        SUBSCRIPTION_ERROR.WHATSAPP_AI_AGENT_REQUIRED,
      );
    }

    throw HttpError.forbidden(
      "This feature is not available on your current plan.",
      undefined,
      SUBSCRIPTION_ERROR.FEATURE_NOT_AVAILABLE,
    );
  }

  async getUsage(organizationId: string, metric: UsageMetric): Promise<number> {
    const { subscription } = await this.getResolvedSubscription(organizationId);

    if (
      metric === USAGE_METRIC.TEAM_MEMBERS ||
      metric === USAGE_METRIC.ACCOUNTS ||
      metric === USAGE_METRIC.CHATBOTS ||
      metric === USAGE_METRIC.WEBHOOKS
    ) {
      return this.countSeatMetric(organizationId, metric);
    }

    const period = await this.subscriptionRepository.findUsagePeriod(
      organizationId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    return Number(period?.metrics?.[metric] || 0);
  }

  async getRemainingUsage(organizationId: string, metric: UsageMetric): Promise<number> {
    const { plan } = await this.getResolvedSubscription(organizationId);
    const used = await this.getUsage(organizationId, metric);
    const limit = this.getPlanLimit(plan, metric);

    if (limit < 0) return Number.POSITIVE_INFINITY;
    return Math.max(0, limit - used);
  }

  async checkLimit(organizationId: string, metric: UsageMetric, increment = 1): Promise<void> {
    await this.assertProductAccess(organizationId);

    const relatedFeature = METRIC_TO_FEATURE[metric];
    if (relatedFeature) {
      await this.checkFeature(organizationId, relatedFeature);
    }

    const { plan } = await this.getResolvedSubscription(organizationId);
    const limit = this.getPlanLimit(plan, metric);
    if (limit < 0) return;

    const used = await this.getUsage(organizationId, metric);
    if (used + increment > limit) {
      const code = METRIC_ERROR[metric] || SUBSCRIPTION_ERROR.PLAN_LIMIT_REACHED;
      throw HttpError.forbidden(
        LIMIT_MESSAGES[code] || LIMIT_MESSAGES[SUBSCRIPTION_ERROR.PLAN_LIMIT_REACHED],
        { metric, used, limit },
        code,
      );
    }
  }

  async recordUsage(
    organizationId: string,
    metric: UsageMetric,
    quantity = 1,
  ): Promise<void> {
    const { subscription } = await this.getResolvedSubscription(organizationId);

    if (
      metric === USAGE_METRIC.TEAM_MEMBERS ||
      metric === USAGE_METRIC.ACCOUNTS ||
      metric === USAGE_METRIC.CHATBOTS ||
      metric === USAGE_METRIC.WEBHOOKS
    ) {
      return;
    }

    await this.subscriptionRepository.upsertUsageIncrement(
      organizationId,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
      metric,
      quantity,
    );
  }

  async incrementUsage(organizationId: string, metric: UsageMetric, quantity = 1) {
    await this.checkLimit(organizationId, metric, quantity);
    await this.recordUsage(organizationId, metric, quantity);
  }

  async getSnapshot(organizationId: string) {
    const { subscription, plan, addons } =
      await this.getResolvedSubscription(organizationId);
    const status = this.resolveEffectiveStatus(subscription);
    const now = utcNow();

    const features = {
      [FEATURE.ACCOUNT_MANAGEMENT]: await this.canAccessFeature(
        organizationId,
        FEATURE.ACCOUNT_MANAGEMENT,
      ),
      [FEATURE.CHATBOTS]: await this.canAccessFeature(organizationId, FEATURE.CHATBOTS),
      [FEATURE.WHATSAPP_MESSAGING]: await this.canAccessFeature(
        organizationId,
        FEATURE.WHATSAPP_MESSAGING,
      ),
      [FEATURE.LEAD_MANAGEMENT]: await this.canAccessFeature(
        organizationId,
        FEATURE.LEAD_MANAGEMENT,
      ),
      [FEATURE.WEBHOOKS]: await this.canAccessFeature(organizationId, FEATURE.WEBHOOKS),
      [FEATURE.WHATSAPP_AI_AGENT]: await this.canAccessFeature(
        organizationId,
        FEATURE.WHATSAPP_AI_AGENT,
      ),
    };

    const limits = this.normalizeLimits(plan);
    const usage = {
      teamMembers: await this.getUsage(organizationId, USAGE_METRIC.TEAM_MEMBERS),
      accounts: await this.getUsage(organizationId, USAGE_METRIC.ACCOUNTS),
      chatbots: await this.getUsage(organizationId, USAGE_METRIC.CHATBOTS),
      webhooks: await this.getUsage(organizationId, USAGE_METRIC.WEBHOOKS),
      leads: await this.getUsage(organizationId, USAGE_METRIC.LEADS),
      whatsappMessages: await this.getUsage(
        organizationId,
        USAGE_METRIC.WHATSAPP_MESSAGES,
      ),
      aiConversations: await this.getUsage(
        organizationId,
        USAGE_METRIC.AI_CONVERSATIONS,
      ),
    };

    const trialEndAt = subscription.trialEndAt;
    const isTrial = status === SUBSCRIPTION_STATUS.TRIALING;
    const isExpired = status === SUBSCRIPTION_STATUS.EXPIRED;
    const showExpirationPrompt =
      isExpired &&
      !subscription.expirationPromptDismissedAt &&
      (!subscription.expirationPromptShownAt ||
        isPast(subscription.expirationPromptShownAt, now));

    return {
      id: String(subscription._id),
      organizationId,
      plan: plan
        ? {
            id: String(plan._id),
            code: plan.code || plan.name,
            name: plan.name,
            description: plan.description,
            currency: plan.currency || "INR",
            monthlyPrice: plan.price?.monthly ?? 0,
            yearlyPrice: plan.price?.annually ?? 0,
            featured: plan.featured,
            featureMap: plan.featureMap || {},
            limits,
          }
        : null,
      status,
      isTrial,
      isActive: status === SUBSCRIPTION_STATUS.ACTIVE,
      isExpired,
      trial: {
        trialStartAt: subscription.trialStartAt || null,
        trialEndAt: trialEndAt || null,
        daysRemaining: isTrial ? daysRemaining(trialEndAt, now) : 0,
      },
      billing: {
        interval: subscription.billingInterval || null,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt || null,
        razorpayKeyId: config.razorpay.keyId,
      },
      features,
      limits,
      usage,
      addons: addons.map((addon) => ({
        addonCode: addon.addonCode,
        status: addon.status,
      })),
      expirationPrompt: {
        shouldShow: Boolean(showExpirationPrompt),
        shownAt: subscription.expirationPromptShownAt || null,
        dismissedAt: subscription.expirationPromptDismissedAt || null,
      },
    };
  }

  async getPublicPlans() {
    const plans = await this.subscriptionRepository.findPublicPlans();
    return plans.map((plan) => this.serializePlan(plan));
  }

  async checkout(
    organizationId: string,
    planId: string,
    interval: "monthly" | "yearly" = "monthly",
  ) {
    await this.assertBillingOrg(organizationId);

    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive || plan.isPublic === false || plan.isTrial) {
      throw HttpError.badRequest("Selected plan is not available");
    }

    const amountRupees =
      interval === "yearly" ? plan.price?.annually : plan.price?.monthly;

    if (!amountRupees || amountRupees <= 0) {
      throw HttpError.badRequest("This plan cannot be purchased");
    }

    assertRazorpayConfigured();

    let order;
    try {
      order = await razorpay.orders.create({
        amount: Math.round(amountRupees * 100),
        currency: plan.currency || "INR",
        receipt: `sub_${String(organizationId).slice(-8)}_${Date.now()}`.slice(0, 40),
        notes: {
          organizationId: String(organizationId),
          planId: String(plan._id),
          interval,
        },
      });
    } catch (error) {
      throw mapRazorpayError(error);
    }

    const sub = await this.subscriptionRepository.findOrgSubscription(organizationId);
    if (sub) {
      sub.razorpayOrderId = String(order.id);
      await sub.save();
    }

    await this.recordPayment({
      organizationId,
      subscriptionId: sub?._id ? String(sub._id) : undefined,
      planId: String(plan._id),
      planCode: plan.code || plan.name,
      planName: plan.name,
      interval,
      amountPaise: Number(order.amount || Math.round(amountRupees * 100)),
      currency: String(order.currency || plan.currency || "INR"),
      status: "pending",
      source: "checkout",
      razorpayOrderId: String(order.id),
    });

    return {
      keyId: config.razorpay.keyId,
      order,
      plan: this.serializePlan(plan),
      interval,
    };
  }

  async verifyPayment(
    organizationId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    const valid = this.verifyRazorpaySignature(
      payload.razorpay_order_id,
      payload.razorpay_payment_id,
      payload.razorpay_signature,
    );

    if (!valid) {
      throw HttpError.badRequest(
        "Payment could not be verified.",
        undefined,
        SUBSCRIPTION_ERROR.INVALID_PAYMENT,
      );
    }

    const order = await razorpay.orders.fetch(payload.razorpay_order_id);
    const notes = (order.notes || {}) as Record<string, string>;

    if (notes.organizationId && notes.organizationId !== organizationId) {
      throw HttpError.forbidden("Payment does not belong to this organization");
    }

    const planId = notes.planId;
    const interval = (notes.interval === "yearly" ? "yearly" : "monthly") as
      | "monthly"
      | "yearly";

    if (!planId) {
      throw HttpError.badRequest("Payment is missing plan information");
    }

    const plan = await Plan.findById(planId);
    if (!plan) throw HttpError.notFound("Plan not found");

    let amountPaise = Number(order.amount || 0);
    let currency = String(order.currency || plan.currency || "INR");
    let method: string | undefined;
    try {
      const payment = await razorpay.payments.fetch(payload.razorpay_payment_id);
      amountPaise = Number(payment.amount || amountPaise);
      currency = String(payment.currency || currency);
      method = payment.method ? String(payment.method) : undefined;
    } catch (error) {
      logger.warn("Could not fetch Razorpay payment details", {
        paymentId: payload.razorpay_payment_id,
        error: (error as Error).message,
      });
    }

    const subscription = await this.activatePaidPlan(organizationId, planId, interval, {
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
    });

    await this.recordPayment({
      organizationId,
      subscriptionId: String(subscription._id),
      planId,
      planCode: plan.code || plan.name,
      planName: plan.name,
      interval,
      amountPaise,
      currency,
      status: "captured",
      source: "checkout_verify",
      razorpayOrderId: payload.razorpay_order_id,
      razorpayPaymentId: payload.razorpay_payment_id,
      method,
      paidAt: utcNow(),
    });

    await this.subscriptionRepository.createEvent({
      subscriptionId: subscription._id,
      organizationId,
      eventType: SUBSCRIPTION_EVENT.PAYMENT_VERIFIED,
      metadata: {
        razorpayOrderId: payload.razorpay_order_id,
        razorpayPaymentId: payload.razorpay_payment_id,
        amountPaise,
      },
    });

    return this.getSnapshot(organizationId);
  }

  async activatePaidPlan(
    organizationId: string,
    planId: string,
    interval: "monthly" | "yearly",
    razorpayIds: { razorpayOrderId?: string; razorpayPaymentId?: string },
  ) {
    const plan = await Plan.findById(planId);
    if (!plan) throw HttpError.notFound("Plan not found");

    const now = utcNow();
    const periodEnd =
      interval === "yearly" ? addMonthsUtc(now, 12) : addMonthsUtc(now, 1);

    let subscription = await this.subscriptionRepository.findOrgSubscription(
      organizationId,
    );

    if (!subscription) {
      subscription = await this.subscriptionRepository.createOrgSubscription({
        organizationId,
        planId: plan._id,
        planCode: plan.code || plan.name,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        billingInterval: interval,
        razorpayOrderId: razorpayIds.razorpayOrderId,
        razorpayPaymentId: razorpayIds.razorpayPaymentId,
      });
    } else {
      subscription.planId = plan._id as any;
      subscription.planCode = plan.code || plan.name;
      subscription.status = SUBSCRIPTION_STATUS.ACTIVE;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = periodEnd;
      subscription.billingInterval = interval;
      subscription.cancelAtPeriodEnd = false;
      subscription.canceledAt = undefined;
      subscription.razorpayOrderId = razorpayIds.razorpayOrderId;
      subscription.razorpayPaymentId = razorpayIds.razorpayPaymentId;
      await subscription.save();
    }

    await this.subscriptionRepository.createEvent({
      subscriptionId: subscription._id,
      organizationId,
      eventType: SUBSCRIPTION_EVENT.PLAN_ACTIVATED,
      metadata: { planId, interval, ...razorpayIds },
    });

    return subscription;
  }

  async cancel(organizationId: string) {
    const { subscription } = await this.getResolvedSubscription(organizationId);
    subscription.cancelAtPeriodEnd = true;
    subscription.canceledAt = utcNow();
    await subscription.save();

    await this.subscriptionRepository.createEvent({
      subscriptionId: subscription._id,
      organizationId,
      eventType: SUBSCRIPTION_EVENT.SUBSCRIPTION_CANCELED,
    });

    return this.getSnapshot(organizationId);
  }

  async acknowledgeExpirationPrompt(organizationId: string) {
    const subscription =
      await this.subscriptionRepository.findOrgSubscription(organizationId);
    if (!subscription) {
      throw HttpError.notFound("Subscription not found");
    }

    const now = utcNow();
    if (!subscription.expirationPromptShownAt) {
      subscription.expirationPromptShownAt = now;
    }
    subscription.expirationPromptDismissedAt = now;
    await subscription.save();
    return this.getSnapshot(organizationId);
  }

  async markExpirationPromptShown(organizationId: string) {
    const subscription =
      await this.subscriptionRepository.findOrgSubscription(organizationId);
    if (!subscription) return;
    if (!subscription.expirationPromptShownAt) {
      subscription.expirationPromptShownAt = utcNow();
      await subscription.save();
    }
  }

  async handleRazorpayWebhook(rawBody: Buffer | string, signature: string) {
    const secret = config.razorpay.webhookSecret || config.razorpay.keySecret;
    const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

    if (expected !== signature) {
      throw HttpError.unauthorized("Invalid Razorpay webhook signature");
    }

    const event = JSON.parse(body) as {
      id?: string;
      event?: string;
      payload?: any;
    };

    const eventId = String(event.id || `${event.event}-${Date.now()}`);
    const existing = await this.subscriptionRepository.findProviderEvent(eventId);
    if (existing) {
      return { duplicate: true };
    }

    await this.subscriptionRepository.createProviderEvent({
      provider: "razorpay",
      eventId,
      eventType: event.event,
      payload: event.payload,
    });

    const notes =
      event.payload?.payment?.entity?.notes ||
      event.payload?.order?.entity?.notes ||
      {};
    const organizationId = notes.organizationId as string | undefined;
    const planId = notes.planId as string | undefined;
    const interval = notes.interval === "yearly" ? "yearly" : "monthly";

    if (
      organizationId &&
      planId &&
      (event.event === "payment.captured" || event.event === "order.paid")
    ) {
      const paymentEntity = event.payload?.payment?.entity || {};
      const subscription = await this.activatePaidPlan(organizationId, planId, interval, {
        razorpayOrderId: paymentEntity.order_id || event.payload?.order?.entity?.id,
        razorpayPaymentId: paymentEntity.id,
      });
      const plan = await Plan.findById(planId);
      await this.recordPayment({
        organizationId,
        subscriptionId: String(subscription._id),
        planId,
        planCode: plan?.code || plan?.name,
        planName: plan?.name,
        interval,
        amountPaise: Number(paymentEntity.amount || event.payload?.order?.entity?.amount || 0),
        currency: String(paymentEntity.currency || "INR"),
        status: "captured",
        source: "webhook",
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        method: paymentEntity.method,
        paidAt: paymentEntity.created_at
          ? new Date(Number(paymentEntity.created_at) * 1000)
          : utcNow(),
      });
    }

    if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity || {};
      const failedOrgId = organizationId || (paymentEntity.notes?.organizationId as string);
      if (failedOrgId) {
        await this.subscriptionRepository.createEvent({
          organizationId: failedOrgId,
          eventType: SUBSCRIPTION_ERROR.PAYMENT_FAILED,
          metadata: { event: event.event, paymentId: paymentEntity.id },
        });
        await this.recordPayment({
          organizationId: failedOrgId,
          planId: paymentEntity.notes?.planId,
          interval: paymentEntity.notes?.interval === "yearly" ? "yearly" : "monthly",
          amountPaise: Number(paymentEntity.amount || 0),
          currency: String(paymentEntity.currency || "INR"),
          status: "failed",
          source: "webhook",
          razorpayOrderId: paymentEntity.order_id,
          razorpayPaymentId: paymentEntity.id,
          method: paymentEntity.method,
          failureReason:
            paymentEntity.error_description ||
            paymentEntity.error_reason ||
            "Payment failed",
        });
      }
    }

    return { processed: true, event: event.event };
  }

  async expireTrials() {
    const now = utcNow();
    const due = await (await import("../models/organization-subscription.model.js"))
      .OrganizationSubscription.find({
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialEndAt: { $lte: now },
      });

    for (const sub of due) {
      sub.status = SUBSCRIPTION_STATUS.EXPIRED;
      await sub.save();
      const already = await this.subscriptionRepository.eventExists(
        String(sub.organizationId),
        SUBSCRIPTION_EVENT.TRIAL_EXPIRED,
        addDaysUtc(now, -2),
      );
      if (!already) {
        await this.subscriptionRepository.createEvent({
          subscriptionId: sub._id,
          organizationId: sub.organizationId,
          eventType: SUBSCRIPTION_EVENT.TRIAL_EXPIRED,
        });
      }
    }

    return { expired: due.length };
  }

  async emitTrialReminders() {
    const now = utcNow();
    const subs = await (
      await import("../models/organization-subscription.model.js")
    ).OrganizationSubscription.find({
      status: SUBSCRIPTION_STATUS.TRIALING,
    });

    for (const sub of subs) {
      const remaining = daysRemaining(sub.trialEndAt, now);
      const mapping: Record<number, string> = {
        7: SUBSCRIPTION_EVENT.TRIAL_7_DAYS_LEFT,
        3: SUBSCRIPTION_EVENT.TRIAL_3_DAYS_LEFT,
        1: SUBSCRIPTION_EVENT.TRIAL_1_DAY_LEFT,
      };
      const eventType = mapping[remaining];
      if (!eventType) continue;

      const exists = await this.subscriptionRepository.eventExists(
        String(sub.organizationId),
        eventType,
      );
      if (!exists) {
        await this.subscriptionRepository.createEvent({
          subscriptionId: sub._id,
          organizationId: sub.organizationId,
          eventType,
          metadata: { daysRemaining: remaining },
        });
      }
    }
  }

  async backfillExistingOrganizations() {
    const orgs = await Organization.find({});
    const legacy =
      (await Plan.findOne({ code: PLAN_CODE.LEGACY })) ||
      (await Plan.findOne({ code: PLAN_CODE.PRO }));

    if (!legacy) {
      throw new Error("Legacy/pro plan must be seeded before backfill");
    }

    let created = 0;
    const now = utcNow();
    for (const org of orgs) {
      const existing = await this.subscriptionRepository.findOrgSubscription(
        String(org._id),
      );
      if (existing) continue;

      await this.subscriptionRepository.createOrgSubscription({
        organizationId: org._id,
        planId: legacy._id,
        planCode: legacy.code || PLAN_CODE.LEGACY,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: addMonthsUtc(now, 12),
        billingInterval: "yearly",
      });
      created += 1;
    }

    return { organizations: orgs.length, created };
  }

  async resolveOrganizationIdFromAccount(accountId: string): Promise<string> {
    const account = await AccountModel.findById(accountId).select("organizationId");
    if (!account?.organizationId) {
      throw HttpError.notFound("Account not found");
    }
    return String(account.organizationId);
  }

  async getPayments(organizationId: string) {
    const [docs, summary] = await Promise.all([
      this.subscriptionRepository.listPayments(organizationId),
      this.subscriptionRepository.paymentSummary(organizationId),
    ]);

    return {
      docs: docs.map((payment) => ({
        id: String(payment._id),
        planName: payment.planName,
        planCode: payment.planCode,
        interval: payment.interval,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        failureReason: payment.failureReason,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      })),
      summary,
    };
  }

  private async recordPayment(input: {
    organizationId: string;
    subscriptionId?: string;
    planId?: string;
    planCode?: string;
    planName?: string;
    interval?: "monthly" | "yearly";
    amountPaise: number;
    currency: string;
    status: "pending" | "captured" | "failed" | "refunded";
    source: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    method?: string;
    failureReason?: string;
    paidAt?: Date;
  }) {
    const filter = input.razorpayOrderId
      ? { razorpayOrderId: input.razorpayOrderId }
      : input.razorpayPaymentId
        ? { razorpayPaymentId: input.razorpayPaymentId }
        : null;

    if (!filter) return;

    const update: Record<string, unknown> = {
      organizationId: input.organizationId,
      amountPaise: input.amountPaise,
      amount: Number((input.amountPaise / 100).toFixed(2)),
      currency: input.currency || "INR",
      status: input.status,
      source: input.source,
      provider: "razorpay",
    };

    if (input.subscriptionId) update.subscriptionId = input.subscriptionId;
    if (input.planId) update.planId = input.planId;
    if (input.planCode) update.planCode = input.planCode;
    if (input.planName) update.planName = input.planName;
    if (input.interval) update.interval = input.interval;
    if (input.razorpayOrderId) update.razorpayOrderId = input.razorpayOrderId;
    if (input.razorpayPaymentId) update.razorpayPaymentId = input.razorpayPaymentId;
    if (input.method) update.method = input.method;
    if (input.failureReason) update.failureReason = input.failureReason;
    if (input.paidAt) update.paidAt = input.paidAt;

    try {
      await this.subscriptionRepository.upsertPayment(filter, update);
    } catch (error) {
      logger.error("Failed to record subscription payment", {
        organizationId: input.organizationId,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        error: (error as Error).message,
      });
    }
  }

  private verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const expected = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return expected === signature;
  }

  private async assertBillingOrg(organizationId: string) {
    const org = await Organization.findById(organizationId);
    if (!org) throw HttpError.notFound("Organization not found");
  }

  private getPlanLimit(plan: any, metric: string): number {
    const key = METRIC_TO_LIMIT[metric];
    const fromMap = plan?.limits?.[key];
    if (typeof fromMap === "number") return fromMap;

    if (metric === USAGE_METRIC.ACCOUNTS) return Number(plan?.maxAccounts ?? 1);
    if (metric === USAGE_METRIC.CHATBOTS) return Number(plan?.maxChatbots ?? 1);
    if (metric === USAGE_METRIC.WEBHOOKS) return Number(plan?.maxWebforms ?? 1);
    return -1;
  }

  private normalizeLimits(plan: any) {
    const limits = plan?.limits || {};
    return {
      teamMembers: limits.teamMembers ?? 3,
      accounts: limits.accounts ?? plan?.maxAccounts ?? 1,
      chatbots: limits.chatbots ?? plan?.maxChatbots ?? 1,
      webhooks: limits.webhooks ?? 5,
      leadsPerMonth: limits.leadsPerMonth ?? 1000,
      whatsappMessagesPerMonth: limits.whatsappMessagesPerMonth ?? 10000,
      aiConversationsPerMonth: limits.aiConversationsPerMonth ?? 0,
    };
  }

  private serializePlan(plan: any) {
    const limits = this.normalizeLimits(plan);
    return {
      id: String(plan._id),
      code: plan.code || plan.name,
      name: plan.name,
      description: plan.description,
      featured: plan.featured,
      currency: plan.currency || "INR",
      monthlyPrice: plan.price?.monthly ?? 0,
      yearlyPrice: plan.price?.annually ?? 0,
      price: plan.price,
      button: plan.button,
      features: plan.features || [],
      addons: plan.addons || [],
      featureMap: plan.featureMap || {},
      limits,
      isPublic: plan.isPublic,
    };
  }

  private async countSeatMetric(organizationId: string, metric: UsageMetric) {
    if (metric === USAGE_METRIC.TEAM_MEMBERS) {
      return OrganizationMember.countDocuments({ organizationId });
    }
    if (metric === USAGE_METRIC.ACCOUNTS) {
      return AccountModel.countDocuments({ organizationId });
    }
    if (metric === USAGE_METRIC.CHATBOTS) {
      const accounts = await AccountModel.find({ organizationId }).select("_id");
      const ids = accounts.map((account) => account._id);
      return ChatbotModel.countDocuments({ accountId: { $in: ids } });
    }
    if (metric === USAGE_METRIC.WEBHOOKS) {
      return WebhookTokenModel.countDocuments({ organizationId });
    }
    return 0;
  }
}
