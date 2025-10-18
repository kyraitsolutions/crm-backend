import { UserRepository } from './../repositories/user.repository';
import { CreateOnboardingDto, OnboardingDto } from "../dtos/userprofile.dto";
import { UserProfileRepository } from "../repositories/userprofile.repository";
import { TCreateUserProfile } from "../types/userprofile.type";
import { TUpdateUser } from '../types';

export class UserProfileService{
    private userprofileRepository:UserProfileRepository;
    private userRepository:UserRepository;

    constructor(){
        this.userprofileRepository=new UserProfileRepository();
        this.userRepository=new UserRepository();
    }

    async createOnboarding(id:string,dto:CreateOnboardingDto):Promise<OnboardingDto>{

        const isExist= await this.userprofileRepository.findByUserId(id);
        if(isExist){
            return new OnboardingDto(isExist);;
        }
        const onboardingData: TCreateUserProfile={
            userId:id,
            firstName:dto.firstName,
            lastName:dto.lastName,
            organizationName:dto.organizationName,
            accountType:dto.accountType
        };

        const userProfile=await this.userprofileRepository.create(onboardingData);
        const dataToUpdate:TUpdateUser={
            onboarding:true
        };
        await this.userRepository.update(userProfile.userId,dataToUpdate);
        return new OnboardingDto(userProfile);
    }



}