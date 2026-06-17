export class RegisterPhoneNumberDto {
  accountId: string;
  pin: string;

  constructor(data: RegisterPhoneNumberDto) {
    this.accountId = data.accountId;
    this.pin = data.pin;

    if (!this.accountId) throw new Error("AccountId is required");
    if (!this.pin) throw new Error("Pin is required");
  }
}
