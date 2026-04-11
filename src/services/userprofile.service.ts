import { UserRepository } from "./../repositories/user.repository.js";
import { CreateOnboardingDto, OnboardingDto } from "../dtos/userprofile.dto.js";
import { UserProfileRepository } from "../repositories/userprofile.repository.js";
import { TCreateUserProfile } from "../types/userprofile.type.js";
import { TUpdateUser } from "../types/user.type.js";
import { TCreateAccount } from "../types/account.type.js";
import { AccountRepository } from "../repositories/account.repository.js";

export class UserProfileService {
  private userprofileRepository: UserProfileRepository;
  private userRepository: UserRepository;
  private accountRepository: AccountRepository;

  constructor() {
    this.userprofileRepository = new UserProfileRepository();
    this.userRepository = new UserRepository();
    this.accountRepository = new AccountRepository();
  }

  async createOnboarding(
    id: string,
    email: string,
    dto: CreateOnboardingDto,
  ): Promise<OnboardingDto> {
    const onboardingData: TCreateUserProfile = {
      userId: id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      profilePicture: dto.profilePicture,
      phone: dto.phone,
      address: dto.address,
    };

    const isExist = await this.userprofileRepository.findByUserId(id);

    if (isExist) {
      const id = isExist.id;
      this.userprofileRepository?.update(id, onboardingData);
    }

    const userProfile = await this.userprofileRepository.create(onboardingData);

    // await this.accountRepository.create(accountData);

    const dataToUpdate: TUpdateUser = {
      onboarding: true,
    };

    await this.userRepository.update(userProfile.userId, dataToUpdate);

    return new OnboardingDto({
      ...userProfile,
      createdAt: new Date(userProfile.createdAt),
      updatedAt: new Date(userProfile.updatedAt),
    });
  }

  async createUserProfile(
    dto: TCreateUserProfile,
  ): Promise<TCreateUserProfile> {
    return this.userprofileRepository.create(dto);
  }
}
