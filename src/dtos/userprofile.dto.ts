export class OnboardingDto{
    id:string;
    userId:string;
    firstName:string;
    lastName:string;
    organizationName: string;
    accountType:string;
    createdAt: Date;
    updatedAt: Date;


    constructor(data:{
        id:string;
        userId:string;
        firstName:string;
        lastName:string;
        organizationName: string;
        accountType:string;
        createdAt: Date;
        updatedAt: Date;
    }){
        this.id=data.id;
        this.userId=data.userId;
        this.firstName=data.firstName;
        this.lastName=data.lastName;
        this.organizationName=data.organizationName;
        this.accountType=data.accountType;
        this.createdAt=data.createdAt;
        this.updatedAt=data.updatedAt;
    }
}


export class CreateOnboardingDto{
    firstName:string;
    lastName:string;
    organizationName: string;
    accountType:string;

    constructor(data:{
        firstName:string;
        lastName:string;
        organizationName: string;
        accountType:string;
    }){
        this.firstName=data.firstName;
        this.lastName=data.lastName;
        this.organizationName=data.organizationName;
        this.accountType=data.accountType;
    }
}