import { NextFunction, Request, Response } from "express";
import { ENV } from "../constants/index.js";
import { LoginDto, RegisterDto } from "../dtos/index.js";
import { OrganizationMember } from "../models/organizationMember.model.js";

import { userAggregateService, userService } from "../container.js";
import httpResponse from "../utils/http.response.js";
import { TRole } from "../types/roles-permissions.type.js";

export class UserController {
  register = async (req: Request,res: Response,next: NextFunction): Promise<void> => {
    try {
      console.log("Register request body:", req.body); // Log the request body for debugging
      const registerDto = new RegisterDto(req.body);
      console.log("register Dto",registerDto);
      const result = await userService.register(registerDto);

      httpResponse(req, res, 201, "User registered successfully", {
        doc: result
      });
      // res.status(201).json(result);
    } catch (error) {
      console.log(error)
      next(error);
    }
  };

  login = async (req: Request,res: Response,next: NextFunction): Promise<void> => {
    try {
      const loginDto = new LoginDto(req.body);
      const result = await userService.login(loginDto);
      httpResponse(req, res, 200, "User logged in successfully", {
        doc: result
      });
      // res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try {
      const {email}=req.body;
      console.log("Body",req.body)
      const result=await userService.forgotPassword(email)
      httpResponse(req, res, 201, "Password sent successfully", {
        doc: result
      });
    } catch (error) {
      next(error);
    }
  }
  verifyOTP=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try {
      const {email,otp}=req.body;
      console.log("Body",req.body)
      const result=await userService.verifyOTP(email,otp)
      httpResponse(req, res, 201, "Password sent successfully", {
        doc: result
      });
    } catch (error) {
      next(error);
    }
  }
  resetPassword=async(req:Request,res:Response,next:NextFunction):Promise<void>=>{
    try {
      const {resetToken,newPassword}=req.body;
      console.log(resetToken,newPassword)
      const result=await userService.resetPassword(resetToken,newPassword);
      httpResponse(req, res, 201, "Password sent successfully", {
        doc: result
      });
    } catch (error) {
      next(error)
    }
  }

  googleCallback = async (req: Request,res: Response,next: NextFunction): Promise<void> => {
    try {
      const user = req.user as any;

      console.log("Google callback user:", user); // Log the user object for debugging
      const token = await userService.generateToken(user.id, user.email);

      const platform = req.query.state;

      const redirectUrl =
        platform === "mobile"
          ? "kyra://auth/callback"
          : ENV.FRONTEND.CALLBACK_URL;
      res.redirect(`${redirectUrl}?token=${token}`);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req?.user?.id;
      const includes = req.query.includes as string;
      const role = req.user?.role as Pick<TRole, "id" | "name" | "level">;
      let includesArray = null;

      if (includes) {
        includesArray = includes?.split(",").map((i) => i.trim());
      }

      const result = await userAggregateService.getMe(
        userId as string,
        role,
        includesArray || [],
      );

      httpResponse(
        req,
        res,
        200,
        "User information fetched successfully",
        result,
      );
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

  // updateProfile = async (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction,
  // ): Promise<void> => {
  //   try {
  //     const userId = (req.user as any).id;
  //     const updateDto = new UpdateUserDto(req.body);
  //     const updatedUser = await this.userService.updateUser(userId, updateDto);
  //     res.status(200).json(updatedUser);
  //   } catch (error) {
  //     next(error);
  //   }
  // };

  // deleteProfile = async (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction,
  // ): Promise<void> => {
  //   try {
  //     const userId = (req.user as any).id;
  //     await this.userService.deleteUser(userId);
  //     res.status(204).send();
  //   } catch (error) {
  //     next(error);
  //   }
  // };
}
