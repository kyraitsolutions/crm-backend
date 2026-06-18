// handleSocketDisconnect.ts

import { AuthenticatedWebSocket } from "../../../types/websocket.type.js";
import { handleVisitorDisconnect } from "./disconnectHandlers/handleVisitorDisconnect.js";

export const handleSocketDisconnect = async (ws: AuthenticatedWebSocket) => {
  try {
    switch (ws.socketType) {
      case "visitor":
        await handleVisitorDisconnect(ws);
        break;

      //   case "agent":
      //     await handleAgentDisconnect(ws);
      //     break;

      default:
        console.warn("Unknown socket disconnect type");
    }
  } catch (error) {
    console.error("Disconnect handler error:", error);
  }
};

// import { VisitorModel } from "../../models/visitors.model";
// import { AuthenticatedWebSocket } from "../../types";

// export const handleSocketDisconnect = async (ws: AuthenticatedWebSocket) => {
//   try {
//     // chatbot visitor offline
//     if (ws.visitorId) {
//       await VisitorModel.updateOne(
//         {
//           visitorId: ws.visitorId,
//         },
//         {
//           $set: {
//             status: "offline",
//             lastSeenAt: new Date(),
//           },
//         },
//       );
//     }
//   } catch (error) {
//     console.error("Disconnect handler error:", error);
//   }
// };
