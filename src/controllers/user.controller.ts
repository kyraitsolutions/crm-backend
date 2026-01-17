import { Request, Response, NextFunction } from "express";
import { RegisterDto, LoginDto, UpdateUserDto } from "../dtos/index.js";
import { ENV } from "../constants/index.js";
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
    next: NextFunction
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
    next: NextFunction
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
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user as any;
      const token = this.userService.generateToken(user.id, user.email);

      // console.log(req);

      const platform = req.query.state;

      // console.log(platform);

      const redirectUrl =
        platform === "mobile"
          ? "kyra://auth/callback"
          : ENV.FRONT_END_CALLBACK_URL;
      res.redirect(`${redirectUrl}?token=${token}`);
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = req.user;
      httpResponse(req, res, 200, "Account information fetched successfully", {
        docs: user,
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
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
    next: NextFunction
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
