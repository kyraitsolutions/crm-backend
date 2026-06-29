import { WhatsappRepository } from "../repositories/whatsapp.respository.js";

export class WhatsappService {
  constructor(private whatsappRepository: WhatsappRepository) {}

  async getList(
    accountId: string,
    paginationOptions?: { limit?: number; skip?: number },
  ): Promise<any> {
    return await this.whatsappRepository.getList(accountId, paginationOptions);
  }
}
