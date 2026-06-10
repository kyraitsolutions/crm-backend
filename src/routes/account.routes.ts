import { Router } from "express";
import { AuthMiddleware } from "../middleware/index.js";
import { ChatBotController } from "../controllers/chat-bot.controller.js";
import { FormController } from "../controllers/form.controller.js";
import { LeadController } from "../controllers/lead.controller.js";
import AnalyticsController from "../controllers/analytics.controller.js";
import { checkSubscriptionStatus } from "../middleware/subscription.middleware.js";
import { EmailController } from "../controllers/email.controller.js";
import { AIController } from "../controllers/ai.controller.js";
import { BroadcastController } from "../controllers/broadcasting.controller.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import { AccountController } from "../controllers/account.controller.js";
import { RecyclebinController } from "../controllers/recyclebin.controller.js";

export class AccountRouter {
  public router: Router;
  private accountController: AccountController;
  private chatBotController: ChatBotController;
  private formController: FormController;
  private leadController: LeadController;
  private analyticsController: AnalyticsController;
  private emailController: EmailController;
  private aiController: AIController;
  private broadcastController: BroadcastController;
  private recyclebinController: RecyclebinController;

  // constructor
  constructor() {
    this.router = Router();
    this.accountController = new AccountController();
    this.chatBotController = new ChatBotController();
    this.formController = new FormController();
    this.leadController = new LeadController();
    this.analyticsController = new AnalyticsController();
    this.emailController = new EmailController();
    this.aiController = new AIController();
    this.broadcastController = new BroadcastController();
    this.recyclebinController = new RecyclebinController();
    this;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {


    // TODO:=======================================================================
    // TODO: Account
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      requirePermission("accounts.view"),
      this.accountController.getAccounts.bind(this.accountController),
    );
    this.router.get(
      "/:accountId",
      AuthMiddleware.authenticate,
      requirePermission("accounts.view"),
      this.accountController.getAccountById.bind(this.accountController),
    );
    this.router.get(
      "/:accountId/access",
      AuthMiddleware.authenticate,
      this.accountController.getAccountAccess.bind(this.accountController),
    );
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      checkSubscriptionStatus,
      requirePermission("accounts.create"),
      this.accountController.createAccount.bind(this.accountController),
    );
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      requirePermission("accounts.edit"),
      this.accountController.updateAccount.bind(this.accountController),
    );
    this.router.delete(
      "/:id",
      AuthMiddleware.authenticate,
      requirePermission("accounts.delete"),
      this.accountController.deleteAccount.bind(this.accountController),
    );
    // TODO:Chatbot
    this.router.get(
      "/:accountId/chatbots",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.view"),
      this.chatBotController.getChatBots.bind(this.chatBotController),
    );

    // get particular chatbot data
    this.router.get(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.view"),
      this.chatBotController.getChatBotById.bind(this.chatBotController),
    );

    this.router.post(
      "/:accountId/chatbot",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.create"),
      this.chatBotController.createChatBot.bind(this.chatBotController),
    );

    // update chatbot by chatbot id for this account
    this.router.put(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.edit"),
      this.chatBotController.updateChatBot.bind(this.chatBotController),
    );

    // delete chatbot by chatbot id for this account
    this.router.delete(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.delete"),
      this.chatBotController.deleteChatBot.bind(this.chatBotController),
    );

    // TODO: =============================================================================================

    // TODO: Forms
    this.router.get(
      "/:accountId/forms",
      AuthMiddleware.authenticate,
      requirePermission("leadForms.view"),
      this.formController.getForms.bind(this.formController),
    );

    this.router.get(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate,
      requirePermission("leadForms.view"),
      this.formController.getFormById.bind(this.formController),
    );
    this.router.post(
      "/:accountId/form",
      AuthMiddleware.authenticate,
      requirePermission("leadForms.create"),
      this.formController.createForm.bind(this.formController),
    );
    this.router.put(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate,
      requirePermission("leadForms.edit"),
      this.formController.updateFormById.bind(this.formController),
    );
    this.router.delete(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate,
      requirePermission("leadForms.delete"),
      this.formController.deleteFormId.bind(this.formController),
    );

    // TODO: =============================================================================================

    // TODO: Leads
    this.router.post(
      "/:accountId/leads",
      AuthMiddleware.authenticate,
      requirePermission("leads.view"),
      this.leadController.getLeads.bind(this.leadController),
    );
    this.router.get(
      "/:accountId/lead/:leadId/details",
      AuthMiddleware.authenticate,
      requirePermission("leads.view"),
      this.leadController.getLead.bind(this.leadController),
    );
    this.router.put(
      "/:accountId/lead/:leadId/update",
      AuthMiddleware.authenticate,
      requirePermission("leads.edit"),
      this.leadController.updateLead.bind(this.leadController),
    );
    this.router.post(
      "/:accountId/lead/",
      AuthMiddleware.authenticate,
      requirePermission("leads.create"),
      this.leadController.createWebhookLead.bind(this.leadController),
    );

    // TODO: Lead Webhook
    this.router.post(
      "/:accountId/lead/webhook/create",
      // AuthMiddleware.authenticate,
      // requirePermission("leads.create"),
      this.leadController.createWebhookLead.bind(this.leadController),
    );

    this.router.get(
      "/:accountId/lead/:leadId/ai-summary",
      AuthMiddleware.authenticate,
      this.leadController.getLeadSummary.bind(this.leadController),
    );
    // this.router.post(
    //   "/:accountId/lead/:formId/create",
    //   AuthMiddleware.authenticate,
    //   requirePermission("leads.create"),
    //   this.leadController.createWebhookLead.bind(this.leadController),
    // );

    // TODO: =============================================================================================

    // TODO: Analytics Overview
    this.router.get(
      "/:accountId/overview",
      AuthMiddleware.authenticate,
      this.analyticsController.getOverviewDashboard.bind(
        this.analyticsController,
      ),
    );

    // TODO: Global Search

    this.router.get(
      "/:accountId/search",
      AuthMiddleware.authenticate,
      this.analyticsController.getSearch.bind(this.analyticsController),
    );

    // TODO: =============================================================================================

    // TODO: Email Campaign
    this.router.get(
      "/:accountId/email/subscribers",
      AuthMiddleware.authenticate,
      this.emailController.getSubscribers.bind(this.emailController),
    );

    // TODO: =============================================================================================

    // TODO: Templates
    this.router.post(
      "/:accountId/template",
      AuthMiddleware.authenticate,
      this.emailController.createTemplate.bind(this.emailController),
    );
    this.router.get(
      "/:accountId/templates",
      AuthMiddleware.authenticate,
      this.emailController.getTemplates.bind(this.emailController),
    );

    // TODO: =============================================================================================

    // TODO: AI Operations

    this.router.get(
      "/:accountId/lead/:leadId/ai-summary",
      AuthMiddleware.authenticate,
      this.aiController.getLeadSummary.bind(this.aiController),
    );

    this.router.post(
      "/:accountId/ai-template",
      AuthMiddleware.authenticate,
      this.aiController.createTemplateContent.bind(this.aiController),
    );
    this.router.post(
      "/webhook",
      // AuthMiddleware.authenticate,
      this.aiController.createTemplateContent.bind(this.aiController),
    );

    // TODO: =============================================================================================

    // TODO: Campaign and Broadcasting
    // 🚀 Start Email Campaign
    this.router.post(
      "/:accountId/campaigns/start",
      AuthMiddleware.authenticate,
      this.broadcastController.startEmailCampaign.bind(
        this.broadcastController,
      ),
    );

    // TODO: =============================================================================================

    // TODO: Recyclebin
    this.router.post(
      "/:accountId/recyclebin",
      AuthMiddleware.authenticate,
      this.recyclebinController.list.bind(this.recyclebinController),
    );

    // TODO: =============================================================================================
  }
  public getRouter(): Router {
    return this.router;
  }
}

//beploy id AKfycbyZ7oQqM9UMLWhsNLbu7XtdzjWIuM8Qy4_BkHsry-ZAKxM8KSUD6BOEUk2bWHrJ0V07

// webapp url https://script.google.com/macros/s/AKfycbyZ7oQqM9UMLWhsNLbu7XtdzjWIuM8Qy4_BkHsry-ZAKxM8KSUD6BOEUk2bWHrJ0V07/exec
