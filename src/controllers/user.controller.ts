import { NextFunction, Request, Response } from "express";
import { ENV } from "../constants/index.js";
import { LoginDto, RegisterDto } from "../dtos/index.js";
import { OrganizationMember } from "../models/organizationMember.model.js";
import { UserService } from "../services/user.service.js";

import httpResponse from "../utils/http.response.js";

export class UserController {
  private userService: UserService;
  constructor() {
    this.userService = new UserService();
  }

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const registerDto = new RegisterDto(req.body);
      const result = await this.userService.register(registerDto);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const loginDto = new LoginDto(req.body);
      const result = await this.userService.login(loginDto);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  googleCallback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const token = this.userService.generateToken(user.id, user.email);

      const platform = req.query.state;

      const redirectUrl =
        platform === "mobile"
          ? "kyra://auth/callback"
          : ENV.FRONT_END_CALLBACK_URL;
      res.redirect(`${redirectUrl}?token=${token}`);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.user as any).id;

      const includes =
        (req.query.include as string)?.split(",").map((i) => i.trim()) || [];

      const data = await this.userService.getMe(userId, includes);

      httpResponse(req, res, 200, "Account fetched successfully", {
        docs: data,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user;
      const { include } = req.query;

      const includes =
        (include as string)?.split(",")?.map((i) => i.trim()) || [];

      let organization = null;

      if (includes.includes("organization")) {
        const organizationDetails = await OrganizationMember.findOne({
          userId: user?.id,
        }).populate("organizationId", "name");

        organization = organizationDetails?.organizationId;
      }

      // const organizations = memberships.map((m) => ({
      //   id: m.organizationId._id,
      //   name: m.,
      //   role: m.role,
      // }));

      httpResponse(req, res, 200, "Account information fetched successfully", {
        docs: {
          ...user,
          ...(organization && { organization }),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req.user as any).id;
      const updateDto = new UpdateUserDto(req.body);
      const updatedUser = await this.userService.updateUser(userId, updateDto);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  };

  deleteProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req.user as any).id;
      await this.userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
