import { Request } from "express";
import { Types } from "mongoose";

// --- Enums & Constants ---
export enum UserRole {
    ADMIN = "ADMIN",
    ACCOUNT_MANAGER = "ACCOUNT_MANAGER",
    TEAM_MEMBER = "TEAM_MEMBER",
    LEAD_MANAGER = "LEAD_MANAGER"
}

export enum PlanName {
    FREE = "free",
    GOLD = "gold",
    PLATINUM = "platinum",
    PAYG = "payg"
}

export enum SubscriptionStatus {
    ACTIVE = "active",
    EXPIRED = "expired"
}

export enum AccountStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}

// --- Domain Models ---
export interface IRole {
    _id: Types.ObjectId | string;
    name: string; // "ADMIN" | "ACCOUNT_MANAGER" etc.
}

export interface IUser {
    _id: Types.ObjectId | string;
    email: string;
    password?: string;
    firstName?: string | null;
    lastName?: string | null;
    googleId?: string | null;
    profilePicture?: string | null;
    roleId?: Types.ObjectId | string | null;
    onboarding: boolean;
    accountType?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAccount {
    _id: Types.ObjectId | string;
    userId: Types.ObjectId | string;
    accountName: string;
    email: string;
    status: AccountStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPlan {
    _id: Types.ObjectId | string;
    name: PlanName;
    price: number;
    durationDays: number;
    maxAccounts: number;
    maxChatbots: number;
    maxWebforms: number;
    features: string[];
}

export interface IUserSubscription {
    _id: Types.ObjectId | string;
    userId: Types.ObjectId | string;
    planId: Types.ObjectId | string;
    status: SubscriptionStatus;
    startedAt: Date;
    expiresAt: Date;
    credits: number;
}


// --- Auth & Request Types ---
export interface AuthUser {
    id: string; // Normalized string ID
    email?: string;
    roleId?: string | null; // Normalized string ID
    accountIds?: string[]; // Allowed accounts
}

export interface RequestWithUser extends Request {
    user?: AuthUser;
}

// --- API Response Types ---
export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    error?: {
        message: string;
        details?: unknown;
        stack?: string; // Only in dev
    };
    request?: {
        method: string;
        baseUrl: string;
        endpoint: string;
    };
}

export interface AccountDto {
    id: string;
    userId: string;
    accountName: string;
    email: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}
