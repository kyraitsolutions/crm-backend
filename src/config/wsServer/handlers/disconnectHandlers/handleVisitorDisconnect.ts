import { VisitorModel } from "../../../../models/visitors.model";
import { AuthenticatedWebSocket } from "../../../../types";
import { disconnectTimeouts } from "../../presenceTimeouts";

export const handleVisitorDisconnect = async (ws: AuthenticatedWebSocket) => {
  if (!ws.visitorId) return;

  const existingTimeout = disconnectTimeouts.get(ws.visitorId);

  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // wait 1 minute before marking offline
  const timeout = setTimeout(async () => {
    await VisitorModel.updateOne(
      {
        visitorId: ws.visitorId,
      },
      {
        $set: {
          status: "offline",
          lastSeenAt: new Date(),
        },
      },
    );

    // remove timeout from map
    disconnectTimeouts.delete(ws.visitorId!);
  }, 60000);

  // store timeout
  disconnectTimeouts.set(ws.visitorId, timeout);
};
