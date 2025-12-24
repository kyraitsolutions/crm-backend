// src/config/wsServer.ts
import http from "http";
import url from "url";
import { WebSocketServer } from "ws";
import { handleEvent } from "./handleEvent.js";
import { AuthenticatedWebSocket } from "../../types/websocket.type.js";

export const createWebSocketServer = (server: http.Server) => {
  // ✅ Attach WS to the same HTTP server (no extra port)
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: AuthenticatedWebSocket, req) => {
    const query = new url.URL(req.url || "", "http://localhost");
    const accountId = query.searchParams.get("accountId");

    ws.accountId = accountId;
    ws.on("message", (raw) => {
      try {
        const { event, data } = JSON.parse(raw.toString());
        // ✅ Dispatch event to handlers
        if (data) {
          handleEvent(event, ws, wss, data);
        } else {
          handleEvent(event, ws, wss);
        }
      } catch {
        console.error("Invalid WS message:", raw.toString());
      }
    });

    ws.on("close", () => console.log("❌ Client disconnected"));
  });

  return wss;
};
