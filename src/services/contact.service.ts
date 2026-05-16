import { ContactRepository } from "../repositories/contact.repository.js";
import { TContact, TCreateContact } from "../types/contact.type.js";




export class ContactService {
    constructor(
        private contactRepository: ContactRepository
    ) { }


    
    async getContacts(
        accountId: string,
        paginationOptions?: { limit?: number; skip?: number },
    ): Promise<any> {
        return await this.contactRepository.getContacts(accountId,paginationOptions);
    }
    async createContact(payload:TCreateContact): Promise<TContact|{}> {
        const existingContact =await this.contactRepository.findExistingContact(
            payload.accountId,
            payload.email,
            payload.phone
        );
        if (existingContact) {
            throw new Error("Contact already exists");
        }

        console.log("Contact payload", payload)
        const contact = await this.contactRepository.createContact(payload);
        return contact;
    }
    async deleteContact(accountId: string, contactId: string): Promise<any | null> {
        const result = await this.contactRepository.deleteContact(accountId, contactId);
        return result;
    }
}
