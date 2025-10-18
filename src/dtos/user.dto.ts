export class UserDto {
  id: number;
  email: string;
  profilePicture?: string | null;
  onboarding: boolean;
  roleId:string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: number;
    email: string;
    profilePicture?: string | null;
    onboarding: boolean;
    roleId:string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.profilePicture = data.profilePicture;
    this.onboarding = data.onboarding;
    this.roleId=data.roleId
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateUserDto {
  email: string;
  password?: string;
  googleId?: string;
  profilePicture?: string;
  onboarding:boolean;
  roleId:string;

  constructor(data: {
    email: string;
    password?: string;
    googleId?: string;
    profilePicture?: string;
    onboarding:boolean;
    roleId:string;
  }) {
    this.email = data.email;
    this.password = data.password;
    this.googleId = data.googleId;
    this.profilePicture = data.profilePicture;
    this.onboarding=data.onboarding;
    this.roleId=data.roleId
  }
}

export class UpdateUserDto {
  profilePicture?: string;
  onboarding:boolean;

  constructor(data: {
    profilePicture?: string;
    onboarding:boolean;
  }) {
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
