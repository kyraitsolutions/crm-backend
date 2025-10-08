import { UserRepository } from "../repositories";
import { UserMapper } from "../mappers";
import { UserDto, AuthResponseDto, RegisterDto, LoginDto } from "../dtos";
import { JwtUtil, PasswordUtil } from "../utils";
import { TCreateUser, TUpdateUser } from "../types";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
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
      firstName: dto.firstName,
      lastName: dto.lastName,
    };

    const user = await this.userRepository.create(userData);
    const userDto = UserMapper.toDto(user);
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

    const userDto = UserMapper.toDto(user);
    const token = JwtUtil.sign({ userId: user.id, email: user.email });

    return new AuthResponseDto({ user: userDto, token });
  }

  async findOrCreateGoogleUser(profile: any): Promise<UserDto> {
    let user = await this.userRepository.findByGoogleId(profile.id);

    if (!user) {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        throw new Error("Google profile does not contain email");
      }

      user = await this.userRepository.findByEmail(email);

      if (!user) {
        const userData: TCreateUser = {
          email,
          googleId: profile.id,
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profilePicture: profile.photos?.[0]?.value,
        };

        user = await this.userRepository.create(userData);
      } else {
        user = await this.userRepository.update(user.id, {
          firstName: profile.name?.givenName,
          lastName: profile.name?.familyName,
          profilePicture: profile.photos?.[0]?.value,
        });
      }
    }

    return UserMapper.toDto(user!);
  }

  async getUserById(id: number): Promise<UserDto | null> {
    const user = await this.userRepository.findById(id);
    const userDto = user ? UserMapper.toDto(user) : null;
    return userDto;
  }

  async updateUser(id: number, data: TUpdateUser): Promise<UserDto> {
    const user = await this.userRepository.update(id, data);
    if (!user) {
      throw new Error("User not found");
    }
    return UserMapper.toDto(user);
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  generateToken(userId: number, email: string): string {
    return JwtUtil.sign({ userId, email });
  }
}
