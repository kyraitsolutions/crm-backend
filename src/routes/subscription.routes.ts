// import { Router } from "express";
// import { subscriptionController } from "../controllers";
// import { AuthMiddleware } from "../middleware";

// export class SubscriptionRouter {
//   public router: Router;
//   private subscriptionController: subscriptionController;

//   constructor() {
//     this.router = Router();
//     this.subscriptionController = new subscriptionController();
//     this.initializeRoutes();
//   }

//   private initializeRoutes(): void {
//     this.router.post(
//       "/register",
//       this.subscriptionController.register.bind(this.subscriptionController)
//     );
//     this.router.post(
//       "/login",
//       this.subscriptionController.login.bind(this.subscriptionController)
//     );
//     this.router.get("/google", AuthMiddleware.googleAuth());
//     this.router.get(
//       "/google/callback",
//       AuthMiddleware.googleCallback(),
//       this.subscriptionController.googleCallback.bind(this.subscriptionController)
//     );

//     this.router.get(
//       "/profile",
//       AuthMiddleware.authenticate,
//       this.subscriptionController.getProfile.bind(this.subscriptionController)
//     );
//     this.router.put(
//       "/profile",
//       AuthMiddleware.authenticate,
//       this.subscriptionController.updateProfile.bind(this.subscriptionController)
//     );
//     this.router.post(
//       "/profile",
//       AuthMiddleware.authenticate,
//       this.subscriptionController.updateProfile.bind(this.subscriptionController)
//     );
//     this.router.delete(
//       "/profile",
//       AuthMiddleware.authenticate,
//       this.subscriptionController.deleteProfile.bind(this.subscriptionController)
//     );
//   }

//   public getRouter(): Router {
//     return this.router;
//   }
// }
