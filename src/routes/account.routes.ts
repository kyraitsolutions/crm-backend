import { Router } from "express";
import { AccountController } from "../controllers/account.controller";
import { AuthMiddleware } from "../middleware";



export class AccountRouter{

    public router:Router;
    private accountController:AccountController;

    // constructor
    constructor(){
        this.router=Router();
        this.accountController=new AccountController();
        this.initializeRoutes();
    }

    private initializeRoutes():void{
        this.router.get("/",AuthMiddleware.authenticate, this.accountController.getAccounts.bind(this.accountController)); //done
        // this.router.get("/:id",AuthMiddleware.authenticate, this.accountController.getAccountById.bind(this.accountController)); //not required for now
        this.router.post("/",AuthMiddleware.authenticate, this.accountController.createAccount.bind(this.accountController)); //done
        this.router.put('/:id',AuthMiddleware.authenticate, this.accountController.updateAccount.bind(this.accountController)); //yet to be done
        this.router.delete('/:id',AuthMiddleware.authenticate, this.accountController.deleteAccount.bind(this.accountController)); //done
    }
    public getRouter():Router{
        return this.router
    }
}