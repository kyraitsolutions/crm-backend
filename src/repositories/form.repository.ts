import { FormModel } from "../models/form.model.js";
import { TCreateForm } from "../types/form.type.js";

export class FormRepository {
    async create(data: TCreateForm): Promise<TCreateForm> {
        return await FormModel.create(data) as unknown as TCreateForm;
    }

    async findByAccountId(userId: string, accountId: string): Promise<any | null> {
        return await FormModel.find({ userId: userId, accountId: accountId });
    }

    async deleteByFormId(userId: string, accountId: string, formId: string): Promise<{} | null> {
        return await FormModel.findOneAndDelete({ userId: userId, accountId: accountId, _id: formId })
    }
}