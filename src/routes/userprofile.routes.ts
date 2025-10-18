import { Router } from "express";
import { AuthMiddleware } from "../middleware";
import { UserProfileController } from "../controllers/userprofile.controller";



export class UserProfileRouter{

    public router:Router;
    private userProfileController:UserProfileController;

    // constructor
    constructor(){
        this.router=Router();
        this.userProfileController=new UserProfileController();
        this.initializeRoutes();
    }

    private initializeRoutes():void{
        this.router.post("/",AuthMiddleware.authenticate, this.userProfileController.createOnboarding.bind(this.userProfileController)); //done
        // this.router.delete('/:id',AuthMiddleware.authenticate, this.accountController.deleteAccount.bind(this.accountController)); //done
    }
    public getRouter():Router{
        return this.router
    }
}