import type { WebSocket } from "ws";

export type TSocketType = "visitor" | "agent" | "user";

export interface AuthenticatedWebSocket extends WebSocket {
  organizationId?:string|null;
  accountId: string | null;
  visitorId: string | null;
  socketType?: TSocketType;
}
