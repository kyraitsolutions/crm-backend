import { incomingMessageHandler } from "./incomingMessage.handler.js";
import { messageStatusHandler } from "./messageStatus.handler.js";
import type { TWhatsAppMessagesValue } from "../types/index.js";

export class MessagesHandler {
  async handle(value: TWhatsAppMessagesValue) {
    if (value.messages?.length) {
      await incomingMessageHandler.handle(value);
    }

    if (value.statuses?.length) {
      await messageStatusHandler.handle(value);
    }
  }
}

export const messagesHandler = new MessagesHandler();
