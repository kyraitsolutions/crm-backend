export class CreateUserProfileDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePicture?: string;
  address?: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    addressLine1: string;
    addressLine2: string;
  };

  constructor(data: {
    userId: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    profilePicture?: string;
    address?: {
      city: string;
      state: string;
      country: string;
      pincode: string;
      addressLine1: string;
      addressLine2: string;
    };
  }) {
    if (!data.userId) throw new Error("Missing required fields userId");

    this.userId = data.userId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.profilePicture = data.profilePicture;
    this.address = data.address;
  }
}
