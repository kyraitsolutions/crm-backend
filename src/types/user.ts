export interface IUser {
  id: number;
  email: string;
  password?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  googleId?: string | null;
  profilePicture?: string | null;
  createdAt: Date;
  updatedAt: Date;
  roleId: number | null;
}

export interface ICreateUser {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  googleId?: string;
  profilePicture?: string;
}

export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
}

export interface IAuthUser {
  userId: string;
  email: string;
}
