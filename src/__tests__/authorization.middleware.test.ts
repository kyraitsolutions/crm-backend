import { accountAccess, authorizeRole } from "../middleware/authorization.middleware";
import { USERROLE } from "../enums/user.enum";
import { TeamMember, TeamMemberAccountLeads } from "../models/team.model";

jest.mock("../models/team.model", () => ({
  TeamMember: { findOne: jest.fn() },
  TeamMemberAccountLeads: { findOne: jest.fn() },
}));

const createMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authorizeRole middleware", () => {
  it("should block when user is missing", () => {
    const req: any = { method: "GET", baseUrl: "/test", originalUrl: "/test" };
    const res = createMockRes();
    const next = jest.fn();

    authorizeRole([USERROLE.ADMIN])(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow when user has required role", () => {
    const req: any = {
      method: "GET",
      baseUrl: "/test",
      originalUrl: "/test",
      user: { id: "1", roleId: USERROLE.ADMIN },
    };
    const res = createMockRes();
    const next = jest.fn();

    authorizeRole([USERROLE.ADMIN])(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe("accountAccess middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should require accountId", async () => {
    const req: any = {
      method: "GET",
      baseUrl: "/account",
      originalUrl: "/account",
      user: { id: "1", roleId: USERROLE.ACCOUNT_MANAGER },
      params: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    await accountAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow admin regardless of account membership", async () => {
    const req: any = {
      method: "GET",
      baseUrl: "/account",
      originalUrl: "/account/abc",
      params: { accountId: "655e1d8b9318be5d6dd8f1d2" },
      user: { id: "1", roleId: USERROLE.ADMIN },
    };
    const res = createMockRes();
    const next = jest.fn();

    await accountAccess(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should block when team membership is missing", async () => {
    (TeamMember.findOne as jest.Mock).mockResolvedValue(null);
    const req: any = {
      method: "GET",
      baseUrl: "/account",
      originalUrl: "/account/abc",
      params: { accountId: "655e1d8b9318be5d6dd8f1d2" },
      user: { id: "1", roleId: USERROLE.ACCOUNT_MANAGER },
    };
    const res = createMockRes();
    const next = jest.fn();

    await accountAccess(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow when team membership and assignment exist", async () => {
    (TeamMember.findOne as jest.Mock).mockResolvedValue({ _id: "tm1" });
    (TeamMemberAccountLeads.findOne as jest.Mock).mockResolvedValue({ _id: "assign1" });
    const req: any = {
      method: "GET",
      baseUrl: "/account",
      originalUrl: "/account/abc",
      params: { accountId: "655e1d8b9318be5d6dd8f1d2" },
      user: { id: "1", roleId: USERROLE.ACCOUNT_MANAGER },
    };
    const res = createMockRes();
    const next = jest.fn();

    await accountAccess(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

