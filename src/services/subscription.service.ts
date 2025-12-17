import { SubscriptionRepository } from './../repositories/subscription.repository';
import { ObjectId } from "mongodb";
import { Plan, UserSubscription } from "../models/subscription.model";
import { AccountModel } from "../models/accounts.model";
import { PlanName, SubscriptionStatus, IUserSubscription } from "../types/core";

export class SubscriptionService {
  private subscriptionRepository: SubscriptionRepository;

  constructor(){
    this.subscriptionRepository=new SubscriptionRepository();
  }
  /**
   * Check if a user can create a new account based on their plan limits.
   * @param userId 
   * @returns boolean
   */
  async canCreateAccount(userId: string): Promise<boolean> {
    const sub = await this.getCurrentSubscription(userId);
    if (!sub) return false;

    const plan = await Plan.findById(sub.planId);
    if (!plan) return false;

    // If Pay-as-you-go, check credits logic if applicable (assuming credits for accounts?) 
    // Or strictly strictly maxAccounts for now.
    // The prompt implies typical tiered limits.

    const accountCount = await AccountModel.countDocuments({ userId: new ObjectId(userId) });

    if (accountCount < plan.maxAccounts) {
      return true;
    }

    return false;
  }


  async getAllSubscriptionPlan():Promise<any>{
    return await this.subscriptionRepository.findAll();
  }


  /**
   * Get the current active subscription for a user.
   * Handles expiration logic implicitly or explicitly.
   */

  

  async getCurrentSubscription(userId: string): Promise<IUserSubscription | null> {
    const sub = await UserSubscription.findOne({
      userId: new ObjectId(userId),
      status: SubscriptionStatus.ACTIVE
    }).sort({ expiresAt: -1 });

    if (!sub) return null;

    // Check expiration
    if (new Date() > sub.expiresAt) {
      sub.status = SubscriptionStatus.EXPIRED;
      await sub.save();
      return null;
    }

    return sub;
  }

  /**
   * Assign a plan to a user.
   */
  async assignPlan(userId: string, planName: PlanName): Promise<IUserSubscription> {
    const plan = await Plan.findOne({ name: planName });
    if (!plan) throw new Error(`Plan ${planName} not found`);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

    // Deactivate old active subscriptions
    await UserSubscription.updateMany(
      { userId: new ObjectId(userId), status: SubscriptionStatus.ACTIVE },
      { $set: { status: SubscriptionStatus.EXPIRED } }
    );

    const newSub = await UserSubscription.create({
      userId: new ObjectId(userId),
      planId: plan._id,
      status: SubscriptionStatus.ACTIVE,
      startedAt: new Date(),
      expiresAt,
      credits: planName === PlanName.PAYG ? 100 : 0 // Example credit assignment
    });

    return newSub;
  }

  /**
   * Initialize default plan for new user (Free tier)
   */
  async initializeDefaultPlan(userId: string): Promise<void> {
    const existing = await UserSubscription.findOne({ userId: new ObjectId(userId) });
    if (!existing) {
      await this.assignPlan(userId, PlanName.FREE);
    }
  }
}
