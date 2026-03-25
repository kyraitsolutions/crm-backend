import {
  AuthResponseDto,
  CreateAndUpdateUserDto,
  LoginDto,
  RegisterDto,
  UserDto,
} from "../dtos/index.js";
import { CreateUserProfileDto } from "../dtos/userprofile.dto.js";
import { SubscriptionPlan } from "../enums/subscription.enum.js";
import { UserRepository } from "../repositories/user.repository.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TGoogleUser } from "../types/index.js";
import { JwtUtil, PasswordUtil } from "../utils/index.js";
import { SubscriptionRepository } from "./../repositories/subscription.repository.js";
import { EmailService } from "./email.service.js";
import { OrganizationService } from "./organization.service.js";

export class UserService {
  private userRepository: UserRepository;
  private emailService: EmailService;
  private subscriptionRepository: SubscriptionRepository;
  private userProfileRepository: UserProfileRepository;
  private organizationService: OrganizationService;

  constructor() {
    this.userRepository = new UserRepository();
    this.userProfileRepository = new UserProfileRepository();
    this.emailService = new EmailService();
    this.subscriptionRepository = new SubscriptionRepository();
    this.userProfileRepository = new UserProfileRepository();
    this.organizationService = new OrganizationService();
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await PasswordUtil.hash(dto.password);

    const userData = new CreateAndUpdateUserDto({
      email: dto.email,
      password: hashedPassword,
    });

    const user = await this.userRepository.create(userData);

    const userDto = new UserDto(user as any);
    const token = JwtUtil.sign({
      userId: user?.id as string,
      email: user?.email as string,
    });

    return new AuthResponseDto({ user: userDto, token });
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
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
    const token = JwtUtil.sign({ userId: user.id, email: user.email });

    return new AuthResponseDto({ user: userDto, token });
  }

  async getMe(userId: string, includes: string[]) {
    const user = await this.userRepository.findById(userId);

    if (!user) throw new Error("User not found");

    let organization = null;

    if (includes.includes("organization")) {
      const orgDetails =
        await this.organizationService.getOrganizationMembersByUserId(userId);

      organization = orgDetails?.organizationId;
    }

    return {
      ...new UserDto(user as any),
      ...(organization && { organization }),
    };
  }

  async findOrCreateGoogleUser(authUser: TGoogleUser): Promise<UserDto | null> {
    const googleId = authUser.id;
    const email = authUser.emails?.[0]?.value;
    const profilePicture = authUser.photos?.[0]?.value;

    if (!email) throw new Error("Google profile does not contain email");

    // 1. Check if user already registered with this googleId
    let user = await this.userRepository.findByGoogleId(googleId);

    if (user) {
      // User already connected with Google → do NOT update email/googleId
      return new UserDto(user);
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
      return new UserDto(user);
    }

    // 3. New Google user → create user
    const userData = {
      email,
      googleId,
    };

    // 4. Create user
    const userDataPayloadDto = new CreateAndUpdateUserDto(userData);
    const newUser = await this.userRepository.create(userDataPayloadDto);

    // 5. Create user profile
    const userProfileDto = new CreateUserProfileDto({
      userId: newUser?.id as string,
      profilePicture,
    });
    await this.userProfileRepository.create(userProfileDto);

    // await this.subscriptionRepository.create(newUser.id, SubscriptionPlan.FREE);
    await this.subscriptionRepository.create(
      newUser?.id as string,
      SubscriptionPlan.FREE,
    );

    this.emailService.queueWelcomeEmail(
      email,
      "https://crm.kyraitsolutions.com/login",
    );

    if (!newUser) throw new Error("User not found");

    return new UserDto(newUser);
  }

  async getUserById(id: string): Promise<UserDto | null> {
    const user = await this.userRepository.findById(id);
    const userDto = user ? new UserDto(user as any) : null;
    return userDto;
  }

  async updateUser(id: string, data: CreateAndUpdateUserDto): Promise<UserDto> {
    const user = await this.userRepository.update(id, data);

    if (!user) {
      throw new Error("User not found");
    }
    return new UserDto(user as any);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  generateToken(userId: string, email: string): string {
    return JwtUtil.sign({ userId, email });
  }
}
