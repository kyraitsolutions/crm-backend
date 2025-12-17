import { Request, Response, NextFunction } from "express";
import { authorizeRole, accountAccess } from "../middleware/authorization.middleware";
import { USERROLE } from "../enums/user.enum";
import { AuthUser, RequestWithUser } from "../types/core";
import { ObjectId } from "mongodb";

// Mock dependencies
jest.mock("../models/team.model", () => ({
    TeamMember: {
        findOne: jest.fn()
    },
    TeamMemberAccountLeads: {
        findOne: jest.fn()
    }
}));

import { TeamMember, TeamMemberAccountLeads } from "../models/team.model";

const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

describe("Authorization Middleware", () => {
    let req: Partial<RequestWithUser>;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            user: {
                id: new ObjectId().toString(),
                email: "test@example.com",
                roleId: null
            }
        };
        res = mockResponse();
        next = mockNext;
        jest.clearAllMocks();
    });

    describe("authorizeRole", () => {
        it("should call next if user has allowed role", () => {
            req.user!.roleId = USERROLE.ADMIN;
            const middleware = authorizeRole([USERROLE.ADMIN]);
            middleware(req as RequestWithUser, res, next);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should return 403 if user does not have allowed role", () => {
            req.user!.roleId = USERROLE.TEAM_MEMBER;
            const middleware = authorizeRole([USERROLE.ADMIN]);
            middleware(req as RequestWithUser, res, next);
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        });

        it("should return 401 if user is not authenticated", () => {
            req.user = undefined;
            const middleware = authorizeRole([USERROLE.ADMIN]);
            middleware(req as RequestWithUser, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
        });
    });

    describe("accountAccess", () => {
        it("should allow ADMIN access to any account", async () => {
            req.user!.roleId = USERROLE.ADMIN;
            req.params = { accountId: new ObjectId().toString() };

            await accountAccess(req as RequestWithUser, res, next);
            expect(next).toHaveBeenCalled();
        });

        it("should return 400 for invalid accountId", async () => {
            req.user!.roleId = USERROLE.ADMIN;
            req.params = { accountId: "invalid-id" };

            await accountAccess(req as RequestWithUser, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
