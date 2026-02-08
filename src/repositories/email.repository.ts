import { ContactModel } from "../models/contact.model.js";
import { EmailTemplateModel } from "../models/emailTemplate";

export class EmailRepository {
    async getSubscribers(accountId:string):Promise<any[]>{
        return await ContactModel.find({accountId}).sort({ createdAt: -1 }).lean();
    }

    async deleteSubscriber(accountId: string, contactId: string): Promise<any | null> {
        return await ContactModel.findByIdAndDelete({ _id: contactId, accountId }).lean();
    }

    async getTemplates(accountId: string): Promise<any[]> {
        return await EmailTemplateModel.find({ accountId }).sort({ createdAt: -1 }).lean();
    }

    async getTemplateById(accountId: string, templateId: string): Promise<any | null> {
        return await EmailTemplateModel.findById({ _id: templateId, accountId }).lean();
    }

    async createTemplate(accountId: string, templateData: any): Promise<any> {
        const template = new EmailTemplateModel({ ...templateData, accountId });
        return await template.save();
    }

    async updateTemplate(accountId: string, templateId: string, updateData: any): Promise<any | null> {
        return await EmailTemplateModel.findByIdAndUpdate({ _id: templateId, accountId }, updateData, { new: true }).lean();
    }

    async deleteTemplate(accountId: string, templateId: string): Promise<any | null> {
        return await EmailTemplateModel.findByIdAndDelete({ _id: templateId, accountId }).lean();
    }

}