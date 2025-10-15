
export class AccountDto{
    id:string;
    userId:string;
    accountName:string;
    email:string;   
    status:string;
    createdAt: Date;
    updatedAt: Date;


    constructor(data:{
        id:string;
        userId:string;
        accountName:string;
        email:string;    
        status:string;
        createdAt: Date;
        updatedAt: Date;
    }){
        this.id=data.id;
        this.userId=data.userId;
        this.accountName=data.accountName;
        this.email=data.email;
        this.status=data.status;
        this.createdAt=data.createdAt;
        this.updatedAt=data.updatedAt;
    }
}


export class CreateAccountDto{
    accountName:string;
    email:string;
    constructor(data:{
        accountName:string;
        email:string;
    }){
        this.accountName=data.accountName;
        this.email=data.email;
    }
}