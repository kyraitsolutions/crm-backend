import { HttpError } from "../utils/http.error.js";
import { TCreateForm } from "./../types/form.type.js";
import { CreateFormDto, FormDto } from "../dtos/form.dto.js";
import { FormRepository } from "../repositories/form.repository.js";
import { AccountRepository } from "../repositories/account.repository.js";
import { ActivityLogService } from "./activityLog.service.js";

export class FormService {
  // Service methods will go here
  private formRepository: FormRepository;
  private accountRepository: AccountRepository;
  private activityLogService = new ActivityLogService();
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
      // userId,
      accountId,
    );
    if (!isAccountExist) {
      throw HttpError.notFound("Account not found for this account id");
    }
    const formData: TCreateForm = {
      userId: userId,
      accountId: accountId,
      ...createFormDto,
    };
    const newForm = await this.formRepository.create(formData);
    const formId = newForm?._id as string;
    await this.activityLogService.logCreate({
      accountId,
      organizationId: String((isAccountExist as any)?.organizationId || ""),
      entityType: "form",
      entityId: String(formId),
      actor: this.activityLogService.userActor({ id: userId }),
      metadata: { name: (newForm as any)?.name },
    });
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
    const existing = await this.formRepository.findByFormId(
      userId,
      accountId,
      formId,
    );
    const updatedForm = await this.formRepository.updateFormById(
      userId,
      accountId,
      formId,
      form,
    );
    const account = await this.accountRepository.findOne(accountId);
    await this.activityLogService.logUpdate({
      oldDoc: existing,
      newDoc: updatedForm,
      accountId,
      organizationId: String((account as any)?.organizationId || ""),
      entityType: "form",
      entityId: formId,
      actor: this.activityLogService.userActor({ id: userId }),
      metadata: { name: (updatedForm as any)?.name },
    });
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
    const account = await this.accountRepository.findOne(accountId);
    await this.activityLogService.logDelete({
      accountId,
      organizationId: String((account as any)?.organizationId || ""),
      entityType: "form",
      entityId: formId,
      actor: this.activityLogService.userActor({ id: userId }),
      metadata: { name: (form as any)?.name },
      deletedData: form,
    });
    return new FormDto(form as any) ?? {};
  }
}
