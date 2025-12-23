// authorization.middleware.ts
import { NextFunction, Response } from "express";
import passport from "passport";
import { ObjectId } from "mongodb";
import { USERROLE } from "../enums/user.enum";
import { TeamMember, TeamMemberAccountLeads } from "../models/team.model";
import { AuthUser, RequestWithUser } from "../types/core";
import httpResponse from "../utils/http.response";

const isRoleMatch = (userRoleId?: string | ObjectId | null, targetRoleId?: string): boolean => {
  if (!userRoleId || !targetRoleId) {
    return false;
  }
  const userRoleString = typeof userRoleId === "string" ? userRoleId : userRoleId.toString();
  return userRoleString === targetRoleId;
};

const normalizeObjectId = (id?: string): ObjectId | null => {
  if (!id) {
    return null;
  }
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

export const requireAuth = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate("jwt", { session: false }, (err: unknown, user: AuthUser | false) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return httpResponse(req, res, 401, "Unauthorized");
    }

    // Harden user id extraction
    // Assuming passport strategy returns User document or AuthUser object
    if (!user.id && !(user as any)._id) {
      return httpResponse(req, res, 401, "Unauthorized - User ID missing");
    }

    // Normalize req.user
    const userId = user.id || (user as any)._id.toString();
    const roleId = user.roleId || (user as any).roleId; // Keep as is, let isRoleMatch handle string/ObjectId

    req.user = {
      id: userId,
      email: user.email,
      roleId: roleId,
      accountIds: user.accountIds,
    };

    return next();
  })(req, res, next);
};

export const authorizeRole = (roles: USERROLE[]) => {
  return (
    req: RequestWithUser,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      httpResponse(req, res, 401, "Unauthorized");
      return;
    }

    const hasRole = roles.some((role) =>
      isRoleMatch(req.user?.roleId, role)
    );

    if (!hasRole) {
      httpResponse(req, res, 403, "Forbidden");
      return;
    }

    next();
  };
};


export const accountAccess = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user || !req.user.id) {
    httpResponse(req, res, 401, "Unauthorized");
    return;
  }

  const accountId =
    (req.params?.accountId as string | undefined) ||
    (req.params?.id as string | undefined) ||
    (req.body?.accountId as string | undefined);

  if (!accountId) {
    httpResponse(req, res, 400, "Account identifier is required");
    return;
  }

  const parsedAccountId = normalizeObjectId(accountId);
  if (!parsedAccountId) {
    httpResponse(req, res, 400, "Invalid account identifier");
    return;
  }

  // Admin access
  if (isRoleMatch(req.user.roleId, USERROLE.ADMIN)) {
    next();
    return;
  }

  // Check if user is the Owner of the account? 
  // Need to check specific logic. Typically account owners have relation to account.
  // Assuming AccountOwner role logic or just checking if they own the account resource?
  // User might not have ACCOUNT_MANAGER role but still valid.
  // But let's follow the code: check allowed roles first.

  const allowedRoles = [USERROLE.ACCOUNT_MANAGER, USERROLE.TEAM_MEMBER];
  const hasAllowedRole = allowedRoles.some((role) =>
    isRoleMatch(req.user?.roleId, role)
  );

  // If they are AccountOwner (if that role exists?) or maybe check Account ownership directly?
  // Existing code: Checks TeamMember and TeamMemberAccountLeads.
  // Missing check: Is the user the Account creator/owner directly?
  // Assuming strict role usage:

  if (!hasAllowedRole) {
    httpResponse(req, res, 403, "Forbidden - Role not allowed");
    return;
  }

  // Verify assignment
  // Note: This logic assumes user MUST be a TeamMember to access account, which might exclude the Account Owner if they don't have a TeamMember entry.
  // Usually Owner is created as a User. We should assume Owner has full access to their accounts.
  // But let's stick to fixing the existing logic robustness for now.

  try {
    const teamMember = await TeamMember.findOne({
      userId: new ObjectId(req.user.id),
    });

    if (!teamMember) {
      // Fallback: Check if user OWNS the account (if schema has userId)
      // We need to import AccountModel to check ownership if TeamMember fails? 
      // Or assume strictly Team context.
      // Given constraint: "AccountManager / TeamMember... can do CRUD only inside assigned account(s)".
      // Admin can do everything.

      httpResponse(req, res, 403, "No team membership found");
      return;
    }

    const assignment = await TeamMemberAccountLeads.findOne({
      teamMemberId: teamMember._id,
      accountId: parsedAccountId,
    });

    if (!assignment) {
      httpResponse(req, res, 403, "Access to this account is not assigned");
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

