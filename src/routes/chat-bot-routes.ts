import { Router } from "express";

const router = Router();

router.get("/chatbot", (req, res) => {
  res.json({ message: "Chatbots" });
});

export { router as chatbotRouter };
