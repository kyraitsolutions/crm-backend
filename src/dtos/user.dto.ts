export class UserDto {
  id?: string;
  email: string;
  onboarding: boolean;
  roleId: string;

  userProfile?: {
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
  };

  organization?: {
    id?: string;
    name?: string;
  };

  userSubscription?: {
    plan: string;
    startDate: Date;
    endDate: Date;
  };

  constructor(data: {
    id?: string;
    email: string;
    onboarding: boolean;
    roleId: string;
    profilePicture?: string | null;
    userProfile?: {
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
    };
    organization?: {
      id?: string;
      name?: string;
    };
    userSubscription?: {
      plan: string;
      startDate: Date;
      endDate: Date;
    };
  }) {
    this.id = data.id;
    this.email = data.email;
    this.onboarding = data.onboarding;
    this.roleId = data.roleId;
    this.userProfile = data.userProfile;
    this.organization = data.organization;
    this.userSubscription = data.userSubscription;
  }
}

export class CreateAndUpdateUserDto {
  email: string;
  googleId?: string;
  password?: string;
  onboarding?: boolean;
  roleId?: string;

  constructor(data: {
    email: string;
    googleId?: string;
    password?: string;
    profilePicture?: string;
    onboarding?: boolean;
    roleId?: string;
  }) {
    this.email = data.email;
    this.googleId = data.googleId;
    Object.assign(this, data);
  }
}

export class LoginDto {
  email: string;
  password: string;

  constructor(data: { email: string; password: string }) {
    this.email = data.email;
    this.password = data.password;
  }
}

export class RegisterDto {
  email: string;
  password: string;

  constructor(data: { email: string; password: string }) {
    this.email = data.email;
    this.password = data.password;
  }
}

export class AuthResponseDto {
  user: UserDto;
  token: string;

  constructor(data: { user: UserDto; token: string }) {
    this.user = data.user;
    this.token = data.token;
  }
}
