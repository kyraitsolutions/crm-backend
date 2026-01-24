import { ContactModel } from "../models/contact.model";

export class EmailRepository {
    async getSubscribers(accountId:string):Promise<any[]>{
        return await ContactModel.find({accountId}).sort({ createdAt: -1 }).lean();
    }
}