// src/config/wsEmitter.ts

import { WebSocket } from "ws";
import { AuthenticatedWebSocket } from "../../types/websocket.type.js";
import { getWssInstance } from "./wsStore.js";

export const emitToAccount = (accountId: string, event: string, data: any) => {
  const wss = getWssInstance();
  console.log("account id", accountId);
  console.log("data kya hai ws ka", data);

  console.log("TOTAL CLIENTS", wss.clients.size);

  wss.clients.forEach((client) => {
    const ws = client as AuthenticatedWebSocket;

    console.log("account id ws", ws.accountId);

    if (
      ws.readyState === WebSocket.OPEN &&
      String(ws.accountId) === String(accountId)
    ) {
      ws.send(
        JSON.stringify({
          event,
          data,
        }),
      );
    }
  });
};
export const emitToOrganization = ({
  organizationId,
  accountId,
  event,
  data,
}: any) => {
  const wss = getWssInstance();

  wss.clients.forEach((client) => {
    const ws = client as AuthenticatedWebSocket;

    console.log("organization id", organizationId);
    console.log("account id ws", ws.organizationId);

    if (
      ws.readyState === WebSocket.OPEN &&
      String(ws.organizationId) === String(organizationId)
    ) {
      ws.send(
        JSON.stringify({
          event,
          data,
        }),
      );
    }
  });
};
