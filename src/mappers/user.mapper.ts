import { UserDto } from "../dtos";
import { TUser } from "../types";

export class UserMapper {
  static toDto(user: TUser): UserDto {
    return new UserDto({
<<<<<<< HEAD
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      roleId: user.roleId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
=======
      _id: user.id,
      email: user.email,
      profilePicture: user.profilePicture,
      roleId: user.roleId!,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      onboarding: user.onboarding,
>>>>>>> 90ddbebf0681a94c6af7cd4b3ccdaa91ebb69e29
    });
  }

  static toDtoArray(users: TUser[]): UserDto[] {
    return users.map((user) => this.toDto(user));
  }
}
