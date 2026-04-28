export class CreateUserProfileDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  address?: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    addressLine1: string;
    addressLine2: string;
  };
  phone?: string;

  constructor(data: {
    userId: string;
    profilePicture?: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!data.userId) throw new Error("Missing required fields userId");
    this.userId = data.userId;
    this.profilePicture = data.profilePicture;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
  }
}

export class UpdateUserProfileDto extends CreateUserProfileDto {}
