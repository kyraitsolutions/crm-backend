// src/config/wsServer.ts
import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { handleEvent } from "./handleEvent";

export const createWebSocketServer = (server: http.Server) => {
  // ✅ Attach WS to the same HTTP server (no extra port)
  const wss = new WebSocketServer({ server });
  console.log("✅ WebSocket server attached to HTTP server");

  wss.on("connection", (ws: WebSocket) => {
    console.log("🔗 New WS client connected");

    ws.on("message", (raw) => {
      try {
        const { event, data } = JSON.parse(raw.toString());

        // ✅ Dispatch event to handlers
        if (data) {
          handleEvent(event, data, ws, wss);
        } else {
          handleEvent(event, {}, ws, wss);
        }
      } catch {
        console.error("Invalid WS message:", raw.toString());
      }
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
  });

  return wss;
};
