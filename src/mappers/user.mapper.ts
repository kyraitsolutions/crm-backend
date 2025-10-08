import { UserDto } from "../dtos";
import { TUser } from "../types";

export class UserMapper {
  static toDto(user: TUser): UserDto {
    return new UserDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      roleId: user.roleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  static toDtoArray(users: TUser[]): UserDto[] {
    return users.map((user) => this.toDto(user));
  }
}
