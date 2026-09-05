import { FEATURE, USAGE_METRIC } from "../constants/subscription.constant.js";
import { SubscriptionService } from "./subscription.service.js";

export class WhatsAppAiAgentService {
  private subscriptionService = new SubscriptionService();

  async assertCanStartConversation(organizationId: string): Promise<void> {
    await this.subscriptionService.checkFeature(
      organizationId,
      FEATURE.WHATSAPP_AI_AGENT,
    );
    await this.subscriptionService.checkLimit(
      organizationId,
      USAGE_METRIC.AI_CONVERSATIONS,
    );
  }

  async recordConversation(organizationId: string): Promise<void> {
    await this.subscriptionService.recordUsage(
      organizationId,
      USAGE_METRIC.AI_CONVERSATIONS,
    );
  }

  async startConversation(organizationId: string): Promise<void> {
    await this.assertCanStartConversation(organizationId);
    await this.recordConversation(organizationId);
  }
}

export const whatsAppAiAgentService = new WhatsAppAiAgentService();
