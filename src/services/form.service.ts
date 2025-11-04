import { TCreateForm } from './../types/form.type';
import { CreateFormDto, FormDto } from "../dtos/form.dto";
import { FormRepository } from '../repositories/form.repository';


export class FormService {
    // Service methods will go here
    private formRepository: FormRepository;
    constructor() {
        this.formRepository = new FormRepository();
    }
    async createForm(userId: string, createFormDto: CreateFormDto): Promise<FormDto> {
        const formData :TCreateForm= {
            accountId: userId,
            ...createFormDto,
        };
        const newForm = await this.formRepository.create(formData);
        return new FormDto(newForm);
    }
    // async getForms(userId: string): Promise<any[]> {
    //     const forms = await this.formRepository.findByAccountId(userId);
    //     return forms;
    // }
}
