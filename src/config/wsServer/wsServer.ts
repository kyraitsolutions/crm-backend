// src/config/wsServer.ts
import http from "http";
import url from "url";
import { WebSocketServer } from "ws";
import { handleEvent } from "./handlers/handleEvent.js";
import { AuthenticatedWebSocket } from "../../types/websocket.type.js";
import { handleSocketDisconnect } from "./handlers/handleSocketDisconnect.js";
import { setWssInstance } from "./wsStore.js";
import { AccountModel } from "../../models/accounts.model.js";
import { Types } from 'mongoose';

export const createWebSocketServer = (server: http.Server) => {
  // ✅ Attach WS to the same HTTP server (no extra port)
  const wss = new WebSocketServer({ server });

  setWssInstance(wss);

  wss.on("connection", async(ws: AuthenticatedWebSocket, req) => {
    const query = new url.URL(req.url || "", "http://localhost");
    const accountId = query.searchParams.get("accountId");
    const visitorId = query.searchParams.get("visitorId");


    const objectAccountId = new Types.ObjectId(accountId||"");
    const account = await AccountModel.findOne({_id:objectAccountId});

    console.log("✅Client connected", accountId,account);
    console.log(wss.clients.size);

    ws.accountId = accountId;
    ws.visitorId = visitorId;
    ws.organizationId=String(account?.organizationId)
    ws.socketType = "visitor";

    ws.on("message", (raw) => {
      try {
        const { event, data } = JSON.parse(raw.toString());

        if (!event) return;
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

    ws.on("close", async () => {
      (console.log("❌Client disconnected", ws.accountId, ws.visitorId),
        await handleSocketDisconnect(ws));
    });
  });

  return wss;
};
