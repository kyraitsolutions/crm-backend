import mongoose, { ClientSession } from "mongoose";
import {
  CreateUserDto,
  RegisterDto,
  UserDto,
  UserResponseDto,
} from "../dtos/index.js";
import { CreateUserProfileDto } from "../dtos/userprofile.dto.js";
import { SubscriptionPlan } from "../enums/subscription.enum.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TGoogleUser, TUser, TUserLogin } from "../types/index.js";
import { JwtUtil, PasswordUtil } from "../utils/index.js";
import { SubscriptionRepository } from "./../repositories/subscription.repository.js";
import { EmailService } from "./email.service.js";

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private userProfileRepository: UserProfileRepository,
    private subscriptionRepository: SubscriptionRepository,
    private emailService: EmailService,
  ) { }

  async register(dto: RegisterDto): Promise<TUser> {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();
      const existingUser = await this.userRepository.findByEmail(dto.email);

      console.log("dto", dto)

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const hashedPassword = await PasswordUtil.hash(dto?.password as string);

      // find role of Admin
      const role = await this.userRepository.findRole("ADMIN");

      // 3. New user → create user
      const userData = {
        email: dto.email,
        password: hashedPassword,
        role: role?._id,
      };

      // 4. Create user
      const userDataPayloadDto = new CreateUserDto(userData);
      const newUser = await this.userRepository.create(userDataPayloadDto, session);

      console.log("New users", newUser)

      // 5. Create user profile
      const userProfileDto = new CreateUserProfileDto({
        userId: newUser?.id as string,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });

      await this.userProfileRepository.create(userProfileDto, session);

      await this.subscriptionRepository.create(
        newUser.id as string,
        SubscriptionPlan.FREE,
        session
      );

      await session.commitTransaction();

      const userDto = newUser;

      const token = JwtUtil.sign({
        userId: newUser?.id as string,
        email: newUser?.email as string,
      });

      return {
        ...userDto,
        token,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    }finally{
      session.endSession();
    }

  }
  async login(dto: TUserLogin): Promise<UserDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await PasswordUtil.compare(
      dto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const userDto = new UserDto(user as any);
    const token = JwtUtil.sign({
      userId: user.id as string,
      email: user.email,
    });

    return { ...userDto, token };
  }
  async findOrCreateGoogleUser(
    authUser: TGoogleUser,
  ): Promise<UserResponseDto> {
    const googleId = authUser.id;
    const email = authUser.emails?.[0]?.value;
    const profilePicture = authUser.photos?.[0]?.value;

    if (!email) throw new Error("Google profile does not contain email");

    // 1. Check if user already registered with this googleId
    let user = await this.userRepository.findByGoogleId(googleId);

    if (user) {
      // User already connected with Google → do NOT update email/googleId
      return new UserResponseDto(user);
    }

    // 2. If googleId not found, check if user exists by email
    user = await this.userRepository.findByEmail(email);

    if (user) {
      // Existing user (ex: team member), but missing googleId
      user = await this.userRepository.update(user?.id as string, {
        email,
        googleId,
      });

      if (!user) throw new Error("User not found");
      return new UserResponseDto(user);
    }

    // find role of Admin
    const role = await this.userRepository.findRole("ADMIN");

    // 3. New Google user → create user
    const userData = {
      email,
      googleId,
      role: role?._id,
    };

    // 4. Create user
    const userDataPayloadDto = new CreateUserDto(userData);
    const newUser = await this.userRepository.create(userDataPayloadDto);

    // 5. Create user profile
    const userProfileDto = new CreateUserProfileDto({
      userId: newUser?.id as string,
      profilePicture,
    });

    await this.userProfileRepository.create(userProfileDto);

    await this.subscriptionRepository.create(
      newUser.id as string,
      SubscriptionPlan.FREE,
    );

    this.emailService.queueWelcomeEmail(
      email,
      "https://crm.kyraitsolutions.com/login",
    );

    if (!newUser) throw new Error("User not found");

    return new UserResponseDto(newUser);
  }
  async getUserById(id: string): Promise<TUser | null> {
    const user = await this.userRepository.findById(id);
    return user;
  }
  async updateUser(
    id: string,
    data: Partial<TUser>,
    session?: ClientSession,
  ): Promise<UserDto> {
    const user = await this.userRepository.update(id, data, session);

    if (!user) {
      throw new Error("User not found");
    }
    return new UserDto(user as any);
  }
  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }
  async generateToken(userId: string, email: string): Promise<string> {
    return JwtUtil.sign({ userId, email });
  }
}
