import type { WebSocket } from "ws";

export interface AuthenticatedWebSocket extends WebSocket {
    accountId: string | null;
}
