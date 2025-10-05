import { UserDto } from "../dtos";
import { IUser } from "../types";

export class UserMapper {
  static toDto(user: IUser): UserDto {
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

  static toDtoArray(users: IUser[]): UserDto[] {
    return users.map((user) => this.toDto(user));
  }
}
