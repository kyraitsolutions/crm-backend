export class DisconnectIntegrationDto {
  integrationId: string;
  accountId: string;

  constructor(data: DisconnectIntegrationDto) {
    this.integrationId = data.integrationId;
    this.accountId = data.accountId;

    if (!this.integrationId) throw new Error("IntegrationId is required");
    if (!this.accountId) throw new Error("AccountId is required");
  }
}
