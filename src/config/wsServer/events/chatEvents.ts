import { WebSocket, WebSocketServer } from "ws";
import { ChatBotController } from "../../../controllers";

export const chatEvents = {
  "chat:messages": (data: any, ws: WebSocket, wss: WebSocketServer) =>
    ChatBotController.getAllChatBotMessages(data, ws, wss),
};
