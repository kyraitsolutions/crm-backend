import { WebSocket, WebSocketServer } from "ws";
import { chatbotEvents } from "./events/chatbotEvents";

export type EventHandler = (
  ws: WebSocket,
  wss: WebSocketServer,
  data: any
) => void;

const eventMap: Record<string, EventHandler> = {
  ...chatbotEvents,
};

export const handleEvent = (
  event: string,
  ws: WebSocket,
  wss: WebSocketServer,
  data = {}
) => {
  const handler = eventMap[event];
  if (handler) {
    handler(ws, wss, data);
  } else {
    console.warn(`⚠️ Unknown event: ${event}`);
  }
};
