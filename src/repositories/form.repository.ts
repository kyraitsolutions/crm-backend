import { FormModel } from "../models/form.model";
import { TCreateForm } from "../types/form.type";

export class FormRepository{
    async create (data:TCreateForm):Promise<TCreateForm>{
        return await FormModel.create(data);
    }

    async findByAccountId(userId:string, accountId:string):Promise<[]| null>{
        return await FormModel.find({userId:userId,accountId:accountId});
    }

    async deleteByFormId(userId:string, accountId:string,formId:string):Promise<{}|null>{
        return await FormModel.findOneAndDelete({userId:userId,accountId:accountId,_id:formId})
    }
}