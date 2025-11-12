import { Router } from "express";
import { AccountController } from "../controllers/account.controller";
import { AuthMiddleware } from "../middleware";
import { ChatBotController } from "../controllers";
import { FormController } from "../controllers/form.controller";

export class AccountRouter {
  public router: Router;
  private accountController: AccountController;
  private chatBotController: ChatBotController;
  private formController: FormController;

  // constructor
  constructor() {
    this.router = Router();
    this.accountController = new AccountController();
    this.chatBotController = new ChatBotController();
    this.formController = new FormController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Accounts
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.accountController.getAccounts.bind(this.accountController)
    ); //done
    // this.router.get("/:id",AuthMiddleware.authenticate, this.accountController.getAccountById.bind(this.accountController)); //not required for now
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.accountController.createAccount.bind(this.accountController)
    ); //done
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      this.accountController.updateAccount.bind(this.accountController)
    ); //yet to be done
    this.router.delete(
      "/:id",
      AuthMiddleware.authenticate,
      this.accountController.deleteAccount.bind(this.accountController)
    ); //done

    // get all chatbot of this account
    this.router.get(
      "/:accountId/chatbots",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBots.bind(this.chatBotController)
    );

    // get particular chatbot data
    this.router.get(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBotById.bind(this.chatBotController)
    );

    // create chatbot for this account
    this.router.post(
      "/:accountId/chatbot",
      AuthMiddleware.authenticate,
      this.chatBotController.createChatBot.bind(this.chatBotController)
    );

    // Accounts
    this.router.get(
      "/",
      AuthMiddleware.authenticate,
      this.accountController.getAccounts.bind(this.accountController)
    ); //done
    this.router.get(
      "/:id",
      AuthMiddleware.authenticate,
      this.accountController.getAccountById.bind(this.accountController)
    ); //not required for now
    this.router.post(
      "/",
      AuthMiddleware.authenticate,
      this.accountController.createAccount.bind(this.accountController)
    ); //done
    this.router.put(
      "/:id",
      AuthMiddleware.authenticate,
      this.accountController.updateAccount.bind(this.accountController)
    ); //yet to be done
    this.router.delete(
      "/:id",
      AuthMiddleware.authenticate,
      this.accountController.deleteAccount.bind(this.accountController)
    ); //done

    // delete chatbot by chatbot id for this account
    this.router.delete(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate
      // this.chatBotController.createChatBot.bind(this.chatBotController)
    );

    // Form routes can be added here
    this.router.get(
      "/:accountId/forms",
      AuthMiddleware.authenticate
      // this.formController.getForms.bind(this.formController)
    );
    this.router.post(
      "/:accountId/form",
      AuthMiddleware.authenticate,
      this.formController.createForm.bind(this.formController)
    );
    this.router.put(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate
      // this.formController.updateForm.bind(this.formController)
    );
    this.router.delete(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate
      // this.formController.deleteForm.bind(this.formController)
    );

    // get all chatbot of this account
    this.router.get(
      "/:accountId/chatbots",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBots.bind(this.chatBotController)
    );

    // get particular chatbot data
    this.router.get(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatBotById.bind(this.chatBotController)
    );

    // create chatbotflow for this account
    this.router.get(
      "/:accountId/chatbot/flow/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.getChatbotFlowById.bind(this.chatBotController)
    );

    // create chatbotflow for this account
    this.router.post(
      "/:accountId/chatbot/create-flow/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.createChatbotFlow.bind(this.chatBotController)
    );

    this.router.post(
      "/:accountId/chatbot",
      AuthMiddleware.authenticate,
      this.chatBotController.createChatBot.bind(this.chatBotController)
    );

    // update chatbot by chatbot id for this account
    this.router.put(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.updateChatBot.bind(this.chatBotController)
    );

    // delete chatbot by chatbot id for this account
    this.router.delete(
      "/:accountId/chatbot/:chatbotId",
      AuthMiddleware.authenticate,
      this.chatBotController.deleteChatBot.bind(this.chatBotController)
    );

    // Form routes can be added here
    this.router.get(
      "/:accountId/forms",
      AuthMiddleware.authenticate
      // this.formController.getForms.bind(this.formController)
    );
    this.router.post(
      "/:accountId/form",
      AuthMiddleware.authenticate,
      this.formController.createForm.bind(this.formController)
    );
    this.router.put(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate
      // this.formController.updateForm.bind(this.formController)
    );
    this.router.delete(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate
      // this.formController.deleteForm.bind(this.formController)
    );

    // Form routes can be added here
    this.router.get(
      "/:accountId/forms",
      AuthMiddleware.authenticate,
      this.formController.getForms.bind(this.formController)
    );
    this.router.post(
      "/:accountId/form",
      AuthMiddleware.authenticate,
      this.formController.createForm.bind(this.formController)
    );
    this.router.put(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate
      // this.formController.updateForm.bind(this.formController)
    );
    this.router.delete(
      "/:accountId/form/:formId",
      AuthMiddleware.authenticate
      // this.formController.deleteForm.bind(this.formController)
    );

    // and so on....
  }
  public getRouter(): Router {
    return this.router;
  }
}
