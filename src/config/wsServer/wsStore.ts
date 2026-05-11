// src/config/wsStore.ts

import { WebSocketServer } from "ws";

let wssInstance: WebSocketServer | null = null;

export const setWssInstance = (wss: WebSocketServer) => {
  wssInstance = wss;
};

export const getWssInstance = () => {
  if (!wssInstance) {
    throw new Error("WebSocket server not initialized");
  }

  return wssInstance;
};
