import { WebSocket, WebSocketServer } from "ws";
import { chatEvents } from "./events/chatEvents";

export type EventHandler = (
  data: any,
  ws: WebSocket,
  wss: WebSocketServer
) => void;

const eventMap: Record<string, EventHandler> = {
  ...chatEvents,
};

export const handleEvent = (
  event: string,
  data: any,
  ws: WebSocket,
  wss: WebSocketServer
) => {
  const handler = eventMap[event];
  if (handler) {
    handler(data, ws, wss);
  } else {
    console.warn(`⚠️ Unknown event: ${event}`);
  }
};
