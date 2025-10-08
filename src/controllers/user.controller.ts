import { Request, Response, NextFunction } from "express";
import { RegisterDto, LoginDto, UpdateUserDto } from "../dtos";
import { ENV } from "../constants";
import { UserService } from "../services";

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
      res.redirect(`${ENV.FRONT_END_CALLBACK_URL}?token=${token}`);
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
      res.status(200).json(user);
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
