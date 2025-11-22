import { WebSocket, WebSocketServer } from "ws";
import { LeadController } from "../../../controllers/lead.controller";
import { WEBSOCKET_EVENTS } from "../../../constants/wsEvent.constants";

const leadController = new LeadController();

export const chatbotEvents = {
  [WEBSOCKET_EVENTS["Chatbot Lead Created"]]: (
    ws: WebSocket,
    wss: WebSocketServer,
    data: any
  ) => leadController.createLeadWs(ws, wss, data),

  [WEBSOCKET_EVENTS["Chatbot Lead Updated"]]: (
    ws: WebSocket,
    wss: WebSocketServer,
    data: any
  ) => leadController.updateLeadWs(ws, wss, data),
};
