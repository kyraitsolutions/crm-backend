import { messageStatusHandler } from "./messageStatus.handler.js";

export class MessagesHandler {
  async handle(value: any) {
    console.log("MessagesHandler", JSON.stringify(value, null, 2));
    // Incoming customer message
    // if (value.messages?.length) {
    //   await incomingMessageHandler.handle(value);
    // }

    // Outgoing message status
    if (value.statuses?.length) {
      await messageStatusHandler.handle(value);
    }
  }
}

export const messagesHandler = new MessagesHandler();
