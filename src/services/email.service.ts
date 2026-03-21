import logger from '../utils/logger.js';
import { emailQueue } from '../queue/queue.js';
import { EmailRepository } from '../repositories/email.repository.js';
import { TEmailTemplate } from '../types/email.type.js';

export class EmailService {
    private emailRepository:EmailRepository;

    constructor() {
        this.emailRepository=new EmailRepository();
    }

    
    async getSubscribers(accountId:string):Promise<any[]>{
        const subscribers=await this.emailRepository.getSubscribers(accountId);
        return subscribers;
    }
    // async deleteSubscriber(accountId:string,contactId:string):Promise<any|null>{
    //     const result=await this.emailRepository.deleteSubscriber(accountId,contactId);
    //     return result;
    // }

    async getTemplates(accountId:string):Promise<any[]>{
        const templates=await this.emailRepository.getTemplates(accountId);
        return templates;
    }
    // async getTemplateById(accountId:string,templateId:string):Promise<any|null>{
    //     const template=await this.emailRepository.getTemplateById(accountId,templateId);
    //     return template;
    // }
    async createTemplate(accountId:string,templateData:TEmailTemplate):Promise<any>{
        console.log("Template data:", templateData);
        const template=await this.emailRepository.createTemplate(accountId,templateData);
        return template;
        return
    }
    // async updateTemplate(accountId:string,templateId:string,updateData:any):Promise<any|null>{
    //     const template=await this.emailRepository.updateTemplate(accountId,templateId,updateData);
    //     return template;
    // }
    // async deleteTemplate(accountId:string,templateId:string):Promise<any|null>{
    //     const result=await this.emailRepository.deleteTemplate(accountId,templateId);
    //     return result;
    // }



    async queueWelcomeEmail(email: string, url: string): Promise<void> {
        await emailQueue.add('welcome-email', {
            email, url
        });
        logger.info(`Welcome email queued for ${email}`);
    }

    // Account Creation Mail
    

    async queueAccountCreationEmail(accountEmail: string, accountName: string): Promise<void> {
        logger.info(`Account created email ${accountEmail}`,);
        await emailQueue.add('account-creation-email', {
            accountEmail,
            accountName
        });
        logger.info(`Account Creation email queued for ${accountEmail}`);
    }
    
}

// export const emailService = new EmailService();
// export default emailService;
