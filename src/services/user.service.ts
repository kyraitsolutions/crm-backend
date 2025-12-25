import { SubscriptionRepository } from './../repositories/subscription.repository.js';
import { EmailService } from './email.service.js';
import { UserRepository } from "../repositories/user.repository.js";
import { UserDto, AuthResponseDto, RegisterDto, LoginDto } from "../dtos/index.js";
import { JwtUtil, PasswordUtil } from "../utils/index.js";
import { TCreateUser, TUpdateUser } from "../types/index.js";
import { TeamMember } from '../models/team.model.js';
import { SubscriptionPlan } from '../enums/subscription.enum.js';

export class UserService {
  private userRepository: UserRepository;
  private emailService: EmailService;
  private subscriptionRepository: SubscriptionRepository


  constructor() {
    this.userRepository = new UserRepository();
    this.emailService = new EmailService();
    this.subscriptionRepository = new SubscriptionRepository();
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await PasswordUtil.hash(dto.password);

    const userData: TCreateUser = {
      email: dto.email,
      password: hashedPassword,
    };

    const user = await this.userRepository.create(userData);

    const userDto = new UserDto(user as any);
    const token = JwtUtil.sign({ userId: user.id, email: user.email });

    return new AuthResponseDto({ user: userDto, token });
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !user.password) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await PasswordUtil.compare(
      dto.password,
      user.password
    );
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const userDto = new UserDto(user as any);
    const token = JwtUtil.sign({ userId: user.id, email: user.email });

    return new AuthResponseDto({ user: userDto, token });
  }

  async findOrCreateGoogleUser(profile: any): Promise<UserDto> {


    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;
    const profilePicture = profile.photos?.[0]?.value;


    if (!email) throw new Error("Google profile does not contain email");

    // 1. Check if user already registered with this googleId
    let user = await this.userRepository.findByGoogleId(googleId);
    if (user) {
      // User already connected with Google → do NOT update email/googleId
      return new UserDto(user as any);
    }


    // 2. If googleId not found, check if user exists by email
    user = await this.userRepository.findByEmail(email);
    if (user) {
      // Existing user (ex: team member), but missing googleId
      user = await this.userRepository.update(user.id, {
        googleId,
        profilePicture,
      });

      const teamMember = await TeamMember.findOne({ userId: user?.id });
      if (teamMember) {
        await TeamMember.updateOne({ userId: user?.id }, { inviteStatus: "ACCEPTED" });
      }
      return new UserDto(user as any);
    }

    // 3. New Google user → create user
    const userData: TCreateUser = {
      email,
      googleId,
      profilePicture,
    };

    const newUser = await this.userRepository.create(userData);
    await this.subscriptionRepository.create(newUser.id, SubscriptionPlan.FREE)
    // const susbcription = await this.subscriptionRepository.create(newUser.id, SubscriptionPlan.FREE)
    this.emailService.queueWelcomeEmail(email, "https://crm.kyraitsolutions.com/login");

    return new UserDto(newUser as any);
  }

  async getUserById(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findById(id);
    const userDto = user ? new UserDto(user as any) : null;
    return userDto;
  }

  async updateUser(id: string, data: TUpdateUser): Promise<UserDto> {
    const user = await this.userRepository.update(id, data);
    if (!user) {
      throw new Error("User not found");
    }
    return new UserDto(user   as any);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  generateToken(userId: string, email: string): string {
    return JwtUtil.sign({ userId, email });
  }
}
