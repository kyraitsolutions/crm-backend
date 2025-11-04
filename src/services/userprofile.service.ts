import { UserRepository } from './../repositories/user.repository';
import { CreateOnboardingDto, OnboardingDto } from "../dtos/userprofile.dto";
import { UserProfileRepository } from "../repositories/userprofile.repository";
import { TCreateUserProfile } from "../types/userprofile.type";
import { TUpdateUser } from '../types';
import { TCreateAccount } from '../types/account.type';
import { AccountRepository } from '../repositories/account.repository';

export class UserProfileService{
    private userprofileRepository:UserProfileRepository;
    private userRepository:UserRepository;
    private accountRepository:AccountRepository;
    
    constructor(){
        this.userprofileRepository=new UserProfileRepository();
        this.userRepository=new UserRepository();
        this.accountRepository=new AccountRepository();
    }

    async createOnboarding(id:string,email:string,dto:CreateOnboardingDto):Promise<OnboardingDto>{

        const isExist= await this.userprofileRepository.findByUserId(id);
        if(isExist){
            return new OnboardingDto(isExist);;
        }
        const onboardingData: TCreateUserProfile={
            userId:id,
            firstName:dto.firstName,
            lastName:dto.lastName,
            organizationName:dto.organizationName,
            // accountType:dto.accountType
            accountType:dto.accountType
        };

        const accountData: TCreateAccount={
            userId:id,
            accountName:dto.organizationName,
            email:email,
            status:"active"
        };

        const userProfile=await this.userprofileRepository.create(onboardingData);
        await this.accountRepository.create(accountData);

        const dataToUpdate:TUpdateUser={
            onboarding:true
        };
        await this.userRepository.update(userProfile.userId,dataToUpdate);
        return new OnboardingDto(userProfile);
    }



}