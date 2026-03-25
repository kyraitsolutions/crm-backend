import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TCreateUserProfile } from "../types/userprofile.type.js";

export class UserProfileService {
  private userprofileRepository: UserProfileRepository;

  constructor() {
    this.userprofileRepository = new UserProfileRepository();
  }

  async createUserProfile(
    dto: TCreateUserProfile,
  ): Promise<TCreateUserProfile> {
    return this.userprofileRepository.create(dto);
  }
}
