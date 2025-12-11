import { TCreateForm } from './../types/form.type';
import { CreateFormDto, FormDto } from "../dtos/form.dto";
import { FormRepository } from '../repositories/form.repository';
import { AccountRepository } from '../repositories/account.repository';


export class FormService {
    // Service methods will go here
    private formRepository: FormRepository;
    private accountRepository:AccountRepository;
    constructor() {
        this.formRepository = new FormRepository();
        this.accountRepository=new AccountRepository();
    }
    async createForm(userId: string,accountId:string, createFormDto: CreateFormDto): Promise<FormDto|null> {
        const isAccountExist= await this.accountRepository.findOne(userId,accountId);
        if(!isAccountExist){
            throw new Error("Account not found for this account id");
        }
        const formData :TCreateForm= {
            userId:userId,
            accountId: accountId,
            ...createFormDto,
        };
        const newForm = await this.formRepository.create(formData);
        return new FormDto(newForm);
    }
    async getForms(userId: string,accountId:string): Promise<FormDto[]|null> {
        const forms = await this.formRepository.findByAccountId(userId,accountId);
        return forms?.map((form) => new FormDto(form)) ?? [];
    }

    async deleteFormById(userId: string,accountId:string,formId:string):Promise<FormDto|null>{
        const form=await this.formRepository.deleteByFormId(userId,accountId,formId);
        return new FormDto(form)??{}
    }
}
