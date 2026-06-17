export class WhatsappRepository {
  async getList(accountId: string,paginationOptions?: { limit?: number; skip?: number }): Promise<any> {

    const limit=paginationOptions?.limit||25;
    const skip=paginationOptions?.skip||0;


    return {
      docs:"conversations",
      totalDocs:10
    }
    // return await ContactModel.find({ accountId})
    //   .sort({ createdAt: -1 })
    //   .lean();
  }
}