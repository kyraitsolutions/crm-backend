import { FormModel } from "../models/form.model.js";
import { TCreateForm } from "../types/form.type.js";

export class FormRepository {
  async create(data: TCreateForm): Promise<TCreateForm> {
    return (await FormModel.create(data)) as unknown as TCreateForm;
  }

  async findByAccountId(
    userId: string,
    accountId: string,
  ): Promise<any | null> {
    return await FormModel.find({ accountId: accountId });
  }

  async findByFormId(
    userId: string,
    accountId: string,
    formId: string,
  ): Promise<any | null> {
    return await FormModel.findOne({
      accountId: accountId,
      _id: formId,
    });
  }

  async updateFormById(
    userId: string,
    accountId: string,
    formId: string,
    form: any,
  ): Promise<{} | null> {
    return await FormModel.findOneAndUpdate(
      { accountId: accountId, _id: formId },
      form,
      { new: true },
    );
  }

  async deleteByFormId(
    userId: string,
    accountId: string,
    formId: string,
  ): Promise<{} | null> {
    return await FormModel.findOneAndDelete({
      accountId: accountId,
      _id: formId,
    });
  }
}
