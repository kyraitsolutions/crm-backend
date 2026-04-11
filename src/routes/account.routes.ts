import { Router } from "express";
import { AuthMiddleware } from "../middleware/index.js";
import { ChatBotController } from "../controllers/chat-bot.controller.js";
import { FormController } from "../controllers/form.controller.js";
import { LeadController } from "../controllers/lead.controller.js";
import AnalyticsController from "../controllers/analytics.controller.js";
import { checkSubscriptionStatus } from "../middleware/subscription.middleware.js";
import { EmailController } from "../controllers/email.controller.js";
import { requirePermission } from "../middleware/authorization.middleware.js";
import { AccountController } from "../controllers/account.controller.js";

export class AccountRouter {
  public router: Router;
  private accountController: AccountController;
  private chatBotController: ChatBotController;
  private formController: FormController;
  private leadController: LeadController;
  private analyticsController: AnalyticsController;
  private emailController: EmailController;

  // constructor
  constructor() {
    this.router = Router();
    this.accountController = new AccountController();
    this.chatBotController = new ChatBotController();
    this.formController = new FormController();
    this.leadController = new LeadController();
    this.analyticsController = new AnalyticsController();
    this.emailController = new EmailController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
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
      requirePermission("accounts.update"),
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
    // get individual chatbot with chatbot flow of this account
    this.router.get(
      "/:accountId/chatbot/:chatbotId/get",

      this.chatBotController.getChatBotWithFlow.bind(this.chatBotController),
    );
    // get particular chatbot data
    this.router.get(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.view"),
      this.chatBotController.getChatBotById.bind(this.chatBotController),
    );

    //get chatbotflow for this account
    this.router.get(
      "/:accountId/chatbot/:chatbotId/flow",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.view"),
      this.chatBotController.getChatbotFlowById.bind(this.chatBotController),
    );

    // create chatbotflow for this account
    this.router.post(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      requirePermission("chatbots.create"),
      this.chatBotController.createChatbotFlow.bind(this.chatBotController),
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
      requirePermission("chatbots.update"),
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
      this.formController.getForms.bind(this.formController),
    );

    this.router.get(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate,
      this.formController.getFormById.bind(this.formController),
    );
    this.router.post(
      "/:accountId/form",
      AuthMiddleware.authenticate,
      this.formController.createForm.bind(this.formController),
    );
    this.router.put(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate,
      this.formController.updateFormById.bind(this.formController),
    );
    this.router.delete(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate,
      this.formController.deleteFormId.bind(this.formController),
    );

    // TODO: =============================================================================================

    // TODO: Leads
    this.router.get(
      "/:accountId/leads",
      AuthMiddleware.authenticate,
      this.leadController.getLeads.bind(this.leadController),
    );
    this.router.put(
      "/:accountId/lead/:leadId/update",
      AuthMiddleware.authenticate,
      this.leadController.updateLead.bind(this.leadController),
    );

    this.router.get(
      "/:accountId/lead/:leadId/ai-summary",
      AuthMiddleware.authenticate,
      this.leadController.getLeadSummary.bind(this.leadController),
    );

    // TODO: Lead Webhook
    this.router.post(
      "/:accountId/lead/:formId/create",
      AuthMiddleware.authenticate,
      this.leadController.createLead.bind(this.leadController),
    );

    // TODO: =============================================================================================

    // TODO: Analytics Overview
    this.router.get(
      "/:accountId/overview",
      AuthMiddleware.authenticate,
      this.analyticsController.getOverview.bind(this.analyticsController),
    );

    // TODO: =============================================================================================

    // TODO: Email Campaign
    this.router.get(
      "/:accountId/email/subscribers",
      AuthMiddleware.authenticate,
      this.emailController.getSubscribers.bind(this.emailController),
    );
    this.router.post(
      "/:accountId/email/template",
      AuthMiddleware.authenticate,
      this.emailController.createTemplate.bind(this.emailController),
    );
  }
  public getRouter(): Router {
    return this.router;
  }
}
