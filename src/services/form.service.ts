import { TCreateForm } from "./../types/form.type.js";
import { CreateFormDto, FormDto } from "../dtos/form.dto.js";
import { FormRepository } from "../repositories/form.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";

export class FormService {
  // Service methods will go here
  private formRepository: FormRepository;
  private accountRepository: AccountRepository;
  constructor() {
    this.formRepository = new FormRepository();
    this.accountRepository = new AccountRepository();
  }
  async createForm(
    userId: string,
    accountId: string,
    createFormDto: CreateFormDto,
  ): Promise<FormDto | null> {
    const isAccountExist = await this.accountRepository.findOne(
      userId,
      accountId,
    );
    if (!isAccountExist) {
      throw new Error("Account not found for this account id");
    }
    const formData: TCreateForm = {
      userId: userId,
      accountId: accountId,
      ...createFormDto,
    };
    const newForm = await this.formRepository.create(formData);
    const formId = newForm?._id as string;
    return new FormDto({ ...newForm, _id: formId });
  }
  async getForms(userId: string, accountId: string): Promise<FormDto[] | null> {
    const forms = await this.formRepository.findByAccountId(userId, accountId);
    return forms?.map((form: any) => new FormDto(form)) ?? [];
  }

  async getFormById(
    userId: string,
    accountId: string,
    formId: string,
  ): Promise<FormDto | null> {
    const form = await this.formRepository.findByFormId(
      userId,
      accountId,
      formId,
    );
    return new FormDto(form as any);
  }

  async updateFormById(
    userId: string,
    accountId: string,
    formId: string,
    form: any,
  ): Promise<FormDto | null> {
    const updatedForm = await this.formRepository.updateFormById(
      userId,
      accountId,
      formId,
      form,
    );
    return new FormDto(updatedForm as any);
  }

  async deleteFormById(
    userId: string,
    accountId: string,
    formId: string,
  ): Promise<FormDto | null> {
    const form = await this.formRepository.deleteByFormId(
      userId,
      accountId,
      formId,
    );
    return new FormDto(form as any) ?? {};
  }
}
