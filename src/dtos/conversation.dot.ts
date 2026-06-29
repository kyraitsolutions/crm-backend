import { TIdentifiers, TPlatform } from "../types/share.type.js";

export class InitConversationDto {
  accountId!: string;
  platform!: TPlatform;
  visitorId!: string;
  identifiers!: TIdentifiers;

  constructor(data: InitConversationDto) {
    Object.assign(this, data);

    if (!this.accountId) throw new Error("accountId is required");
    if (!this.platform) throw new Error("platform is required");
    if (!this.visitorId) throw new Error("visitorId is required");
    if (!this.identifiers) throw new Error("identifiers is required");
    const hasAtLeastOneIdentifier = Object.values(this.identifiers).some(
      Boolean,
    );

    if (!hasAtLeastOneIdentifier) {
      throw new Error("At least one identifier is required");
    }
  }
}
