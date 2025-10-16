export class UserDto {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roleId?: number | null;
  profilePicture?: string | null;
  onboarding:boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: number;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    roleId?: number | null;
    role?: string | null;
    onboarding:boolean;
    profilePicture?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.profilePicture = data.profilePicture;
    this.roleId = data.roleId;
    this.onboarding=data.onboarding;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateUserDto {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  googleId?: string;
  profilePicture?: string;
  onboarding:boolean;

  constructor(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    googleId?: string;
    profilePicture?: string;
    onboarding:boolean;
  }) {
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.googleId = data.googleId;
    this.profilePicture = data.profilePicture;
    this.onboarding=data.onboarding;
  }
}

export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  onboarding:boolean;

  constructor(data: {
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    onboarding:boolean;
  }) {
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.profilePicture = data.profilePicture;
    this.onboarding=data.onboarding;
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
  firstName?: string;
  lastName?: string;

  constructor(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
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
