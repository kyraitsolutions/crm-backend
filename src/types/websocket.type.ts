import type { WebSocket } from "ws";

export type TSocketType = "visitor" | "agent" | "user";

export interface AuthenticatedWebSocket extends WebSocket {
  accountId: string | null;
  visitorId: string | null;
  socketType?: TSocketType;
}
