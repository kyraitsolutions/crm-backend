import { ParsedQs } from "qs";
import { config } from "../../../../config/index.js";

export class WebhookVerificationService {
  private readonly verifyToken = config.meta.VERIFY_WEBHOOK_TOKEN;

  public verify(query: ParsedQs): string {
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    if (!mode || !token || !challenge) {
      throw new Error("Missing webhook verification parameters.");
    }

    if (mode !== "subscribe") {
      throw new Error("Invalid webhook mode.");
    }

    if (token !== this.verifyToken) {
      throw new Error("Invalid webhook verify token.");
    }

    return String(challenge);
  }
}
