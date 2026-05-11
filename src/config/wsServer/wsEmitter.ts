// src/config/wsEmitter.ts

import { WebSocket } from "ws";
import { AuthenticatedWebSocket } from "../../types/websocket.type.js";
import { getWssInstance } from "./wsStore.js";

export const emitToAccount = (accountId: string, event: string, data: any) => {
  const wss = getWssInstance();

  // console.log("TOTAL CLIENTS", wss.clients.size);

  wss.clients.forEach((client) => {
    const ws = client as AuthenticatedWebSocket;

    console.log("wss", ws.accountId, accountId);

    if (ws.readyState === WebSocket.OPEN && ws.accountId === accountId) {
      ws.send(
        JSON.stringify({
          event,
          data,
        }),
      );
    }
  });
};
