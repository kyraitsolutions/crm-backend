import { Request, Response } from "express";
import { MessageService } from "../services/messages.service";

export class MessageController {
  private service: MessageService;

  constructor() {
    this.service = new MessageService();
  }

  public async saveMessage(req: Request, res: Response) {
    try {
      const result = await this.service.saveMessage(req.body);

      return res.status(201).json({
        success: true,

        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,

        message: error.message,
      });
    }
  }
}
