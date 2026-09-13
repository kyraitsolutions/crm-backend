import { WebSocket } from "ws";
import { AuthenticatedWebSocket } from "../../types/websocket.type.js";
import { getWssInstance } from "./wsStore.js";
import logger from "../../utils/logger.js";

const send = (event: string, data: unknown) => JSON.stringify({ event, data });

export const emitToAccount = (accountId: string, event: string, data: any) => {
  const wss = getWssInstance();
  if (!wss || !accountId) return;

  try {
    wss.clients.forEach((client) => {
      const ws = client as AuthenticatedWebSocket;
      if (
        ws.readyState === WebSocket.OPEN &&
        String(ws.accountId) === String(accountId)
      ) {
        ws.send(send(event, data));
      }
    });
  } catch (error) {
    logger.warn("Failed to emit websocket event to account", {
      accountId,
      event,
      error: (error as Error).message,
    });
  }
};

export const emitToOrganization = ({
  organizationId,
  event,
  data,
}: {
  organizationId: string;
  accountId?: string;
  event: string;
  data: any;
}) => {
  const wss = getWssInstance();
  if (!wss || !organizationId) return;

  try {
    wss.clients.forEach((client) => {
      const ws = client as AuthenticatedWebSocket;
      if (
        ws.readyState === WebSocket.OPEN &&
        String(ws.organizationId) === String(organizationId)
      ) {
        ws.send(send(event, data));
      }
    });
  } catch (error) {
    logger.warn("Failed to emit websocket event to organization", {
      organizationId,
      event,
      error: (error as Error).message,
    });
  }
};
