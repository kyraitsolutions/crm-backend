import { Router } from "express";
import { AccountController } from "../controllers/account.controller";
import { AuthMiddleware } from "../middleware";
import { ChatBotController } from "../controllers";



export class AccountRouter{

    public router:Router;
    private accountController:AccountController;
    private chatBotController: ChatBotController;

    // constructor
    constructor(){
        this.router=Router();
        this.accountController=new AccountController();
        this.chatBotController = new ChatBotController();
        this.initializeRoutes();
    }

    private initializeRoutes():void{
        this.router.get("/",AuthMiddleware.authenticate, this.accountController.getAccounts.bind(this.accountController)); //done
        // this.router.get("/:id",AuthMiddleware.authenticate, this.accountController.getAccountById.bind(this.accountController)); //not required for now
        this.router.post("/",AuthMiddleware.authenticate, this.accountController.createAccount.bind(this.accountController)); //done
        this.router.put('/:id',AuthMiddleware.authenticate, this.accountController.updateAccount.bind(this.accountController)); //yet to be done
        this.router.delete('/:id',AuthMiddleware.authenticate, this.accountController.deleteAccount.bind(this.accountController)); //done



        // get all chatbot of this account
        this.router.get(
            "/:accountId/chatbots",
            AuthMiddleware.authenticate,
            this.chatBotController.getChatBots.bind(this.chatBotController)
        );

        // get particular chatbot data
        this.router.get(
            "/:accountId/chatbots/:chabotId",
            AuthMiddleware.authenticate,
            this.chatBotController.getChatBots.bind(this.chatBotController)
        );

        // create chatbot for this account
        this.router.post(
            "/:accountId/chatbot",
            AuthMiddleware.authenticate,
            this.chatBotController.createChatBot.bind(this.chatBotController)
        );

        // get chatbot by chatbot id for this account
        this.router.put(
            "/:accountId/chatbot/:chatbotId",
            AuthMiddleware.authenticate,
            this.chatBotController.createChatBot.bind(this.chatBotController)
        );

        // delete chatbot by chatbot id for this account
        this.router.delete(
            "/:accountId/chatbot/:chatbotId",
            AuthMiddleware.authenticate,
            this.chatBotController.createChatBot.bind(this.chatBotController)
        );

        // and so on....
    }
    public getRouter():Router{
        return this.router
    }
}