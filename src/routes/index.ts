import { Router } from "express";
import { userRouter } from "./user.routes";
import { chatbotRouter } from "./chat-bot-routes";

const appRouter = Router();

appRouter.use("/", userRouter);
appRouter.use("/chatbot", chatbotRouter);

export { appRouter };
