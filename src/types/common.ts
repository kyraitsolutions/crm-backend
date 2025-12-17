import { Request } from "express";
import { Types } from "mongoose";

export type RoleName = "ADMIN" | "ACCOUNT_MANAGER" | "TEAM_MEMBER" | "LEAD_MANAGER";

export interface AuthUser {
  id: string;
  email?: string;
  roleId?: string | Types.ObjectId | null;
  accountIds?: string[];
}

export type RequestWithUser = Request & { user: AuthUser };

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: {
    message: string;
    details?: unknown;
  };
  request?: {
    method: string;
    baseUrl: string;
    endpoint: string;
  };
}

export interface Role {
  _id: string | Types.ObjectId;
  name: RoleName;
}

export interface AccountDtoShape {
  id: string;
  userId: string;
  accountName: string;
  email: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

