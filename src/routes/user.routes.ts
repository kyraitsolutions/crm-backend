import { Router } from "express";
import { UserController } from "../controllers";
import { AuthMiddleware } from "../middleware";

const router = Router();
const userController = new UserController();

router.post("/auth/register", userController.register);
router.post("/auth/login", userController.login);

router.get("/auth/google", AuthMiddleware.googleAuth());
router.get(
  "/auth/google/callback",
  AuthMiddleware.googleCallback(),
  userController.googleCallback
);

router.get("/profile", AuthMiddleware.authenticate, userController.getProfile);
router.put(
  "/profile",
  AuthMiddleware.authenticate,
  userController.updateProfile
);
router.delete(
  "/profile",
  AuthMiddleware.authenticate,
  userController.deleteProfile
);

export { router as userRouter };
