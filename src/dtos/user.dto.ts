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

  token?: string;

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
    token: string;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.onboarding = data.onboarding;
    this.roleId = data.roleId;
    this.userProfile = data.userProfile;
    this.organization = data.organization;
    this.userSubscription = data.userSubscription;
    this.token = data?.token;
  }
}

export class CreateUserDto {
  email: string;
  password?: string;
  googleId?: string;
  roleId?: string;

  constructor(data: Partial<CreateUserDto>) {
    if (!data.email) throw new Error("Email is required");

    this.email = data.email;
    this.password = data.password;
    this.googleId = data.googleId;
    this.roleId = data.roleId;
  }
}

export class UserResponseDto {
  id: string;
  email: string;
  role?: string;

  constructor(user: any) {
    this.id = user.id;
    this.email = user.email;
    this.role = user.role;
  }
}

export class UpdateUserDto {
  email?: string;
  password?: string;
  googleId?: string;
  onboarding?: boolean;
  roleId?: string;

  constructor(data: Partial<UpdateUserDto>) {
    Object.assign(this, data);
  }
}

export class RegisterDto {
  firstName?:string
  lastName?:string
  email: string;
  password: string;

  constructor(data: { firstName:string,lastName:string, email: string; password: string }) {
    if (!data.email) throw new Error("Email is required");
    if (!data.password) throw new Error("Password is required");
    this.firstName=data.firstName;
    this.lastName=data.lastName;
    this.email = data.email;
    this.password = data.password;
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
