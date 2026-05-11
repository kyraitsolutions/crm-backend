import { WebSocketServer } from "ws";
import { AuthenticatedWebSocket } from "../../../types/websocket.type.js";
import { chatbotEvents } from "../events/chatbotEvents.js";

export type EventHandler = (
  ws: AuthenticatedWebSocket,
  wss: WebSocketServer,
  data: any,
) => void;

const eventMap: Record<string, EventHandler> = {
  ...chatbotEvents,
};

export const handleEvent = (
  event: string,
  ws: AuthenticatedWebSocket,
  wss: WebSocketServer,
  data = {},
) => {
  const handler = eventMap[event];
  if (handler) {
    handler(ws, wss, data);
  } else {
    console.warn(`⚠️ Unknown event: ${event}`);
  }
};
