export class OnboardingDto {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture: string;
  address: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    addressLine1: string;
    addressLine2: string;
  };
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    _id: string;
    userId: string;
    firstName: string;
    lastName: string;
    phone: string;
    profilePicture: string;
    address: {
      city: string;
      state: string;
      country: string;
      pincode: string;
      addressLine1: string;
      addressLine2: string;
    };
    createdAt: Date;
    updatedAt: Date;
  }) {
    this._id = data._id;
    this.userId = data.userId;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.profilePicture = data.profilePicture;
    this.address = data.address;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateOnboardingDto {
  firstName: string;
  lastName: string;
  phone: string;
  profilePicture: string;
  address: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    addressLine1: string;
    addressLine2: string;
  };
  constructor(data: {
    firstName: string;
    lastName: string;
    phone: string;
    profilePicture: string;
    address: {
      city: string;
      state: string;
      country: string;
      pincode: string;
      addressLine1: string;
      addressLine2: string;
    };
  }) {
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.profilePicture = data.profilePicture;
    this.address = data.address;

    if (data?.address) {
      this.address.city = data.address.city;
      this.address.state = data.address.state;
      this.address.country = data.address.country;
      this.address.pincode = data.address.pincode;
      this.address.addressLine1 = data.address.addressLine1;
      this.address.addressLine2 = data.address.addressLine2;
    }
  }
}
