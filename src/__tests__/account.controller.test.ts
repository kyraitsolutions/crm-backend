import { AccountController } from "../controllers/account.controller";
import { AccountService } from "../services/account.service";
import { Request, Response } from "express";

jest.mock("../services/account.service");

const createMockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe("AccountController", () => {
  let controller: AccountController;
  let mockReq: Partial<Request>;
  let mockRes: Response;
  const next = jest.fn();

  beforeEach(() => {
    controller = new AccountController();
    mockRes = createMockRes();
    mockReq = {
      method: "POST",
      baseUrl: "/account",
      originalUrl: "/account",
      user: { id: "user-1", roleId: "role-1" } as any,
      body: { accountName: "Test Account", email: "test@example.com" },
      params: {},
    };
    jest.clearAllMocks();
  });

  it("should handle existing account conflict", async () => {
    (AccountService as jest.Mock).mockImplementation(() => ({
      createAccount: jest.fn().mockResolvedValue({ isExist: true, message: "exists" }),
    }));
    await controller.createAccount(
      mockReq as Request,
      mockRes as Response,
      next
    );
    expect(mockRes.status).toHaveBeenCalledWith(409);
  });

  it("should return created account response", async () => {
    const created = { id: "acc1", accountName: "Test", email: "test@example.com" };
    (AccountService as jest.Mock).mockImplementation(() => ({
      createAccount: jest.fn().mockResolvedValue(created),
    }));

    await controller.createAccount(
      mockReq as Request,
      mockRes as Response,
      next
    );

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalled();
  });
});

