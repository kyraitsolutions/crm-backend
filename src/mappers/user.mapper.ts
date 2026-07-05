import { UserDto } from "../dtos/user.dto.js";
import { TUser } from "../types/user.type.js";

export class UserMapper {
  static toDto(user: TUser): UserDto {
    return new UserDto({
      id: user.id,
      email: user.email,
      profilePicture: (user as TUser & { profilePicture?: string })
        .profilePicture,
      roleId: String(user.role?.id),
      token: (user as TUser & { token?: string }).token ?? "",
      // createdAt: user?.createdAt,
      // updatedAt: user.updatedAt,
      onboarding: user.onboarding ?? false,
    });
  }

  static toDtoArray(users: TUser[]): UserDto[] {
    return users.map((user) => this.toDto(user));
  }
}
