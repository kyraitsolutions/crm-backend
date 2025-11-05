import { FormModel } from "../models/form.model";
import { TCreateForm } from "../types/form.type";

export class FormRepository{
    async create (data:TCreateForm):Promise<TCreateForm>{
        return await FormModel.create(data);
    }
}