import { Plan, UserSubscription } from "../models/subscription.model.js";

export class SubscriptionRepository {
  async findAll(): Promise<any> {
    return await Plan.find();
  }

  async create(userId: string, planId: string): Promise<any> {
    const plan = await Plan.findById(planId).select("durationDays");

    if (!plan) {
      throw new Error("Plan not found");
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt);
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    return await UserSubscription.create({
      userId,
      planId,
      startedAt,
      expiresAt,
      status: "active",
    });
  }
}
