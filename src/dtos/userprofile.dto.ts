export interface Address {
  city: string;
  state: string;
  country: string;
  pincode: string;
  addressLine1: string;
  addressLine2?: string;
}

export class CreateUserProfileDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  address?:Address
  phone?: string;

  constructor(data: {
    userId: string;
    profilePicture?: string;
    firstName?: string;
    lastName?: string;
    address?:Address;
    phone?: string;
  }) {
    if (!data.userId) throw new Error("Missing required fields userId");
    this.userId = data.userId;
    this.profilePicture = data.profilePicture;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.address= data.address
    this.phone=data.phone
  }
}

export class UpdateUserProfileDto extends CreateUserProfileDto {}
