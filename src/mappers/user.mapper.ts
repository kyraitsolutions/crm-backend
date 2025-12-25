import { UserDto } from "../dtos";
import { TUser } from "../types";

export class UserMapper {
  static toDto(user: TUser): UserDto {
    return new UserDto({
      _id: user.id,
      email: user.email,
      profilePicture: user.profilePicture,
      roleId: user.roleId!,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      onboarding: user.onboarding,
    });
  }

  static toDtoArray(users: TUser[]): UserDto[] {
    return users.map((user) => this.toDto(user));
  }
}
