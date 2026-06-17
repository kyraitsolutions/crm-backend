import { ClientSession } from "mongoose";
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
} from "../dtos/userprofile.dto.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";

export class UserProfileService {
  constructor(private userprofileRepository: UserProfileRepository) {}

  async create(userprofile: CreateUserProfileDto) {
    const userProfile = new CreateUserProfileDto(userprofile);
    return this.userprofileRepository.create(userProfile);
  }

  async update(
    id: string,
    userProfile: UpdateUserProfileDto,
    session?: ClientSession,
  ) {
    return this.userprofileRepository.update(id, userProfile, session);
  }
}
