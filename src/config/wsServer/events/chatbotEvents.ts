import { WebSocketServer } from "ws";
import { LeadController } from "../../../controllers/lead.controller.js";
import { WEBSOCKET_EVENTS } from "../../../constants/wsEvent.constants.js";
import { AuthenticatedWebSocket } from "../../../types/websocket.type.js";

const leadController = new LeadController();

export const chatbotEvents = {
  [WEBSOCKET_EVENTS["Chatbot Lead Created"]]: (
    ws: AuthenticatedWebSocket,
    wss: WebSocketServer,
    data: any
  ) => leadController.createLeadWs(ws, wss, data),

  [WEBSOCKET_EVENTS["Chatbot Lead Updated"]]: (
    ws: AuthenticatedWebSocket,
    wss: WebSocketServer,
    data: any
  ) => leadController.updateLeadWs(ws, wss, data),
};
