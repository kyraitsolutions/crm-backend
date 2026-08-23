import { Request, Response } from "express";
import httpResponse from "../../../../utils/http.response.js";
import { WhatsappMessageService } from "../services/message.service.js";
import { SendMessageDto } from "../dtos/send-message.dto.js";

export const parseMultipartJson = (body: Record<string, any>) => {
  const fields = ["text", "image", "video", "document", "audio", "template"];

  for (const field of fields) {
    if (body[field]) {
      body[field] = JSON.parse(body[field]);
    }
  }

  return body;
};

export class MessageController {
  private messageService = new WhatsappMessageService();

  public async sendMessage(req: Request, res: Response) {
    const { accountId } = req.params;
    const body = parseMultipartJson({ ...req.body });

    const payload = new SendMessageDto({
      ...body,
      file: req.file || null,
    }).validate();

    const result = await this.messageService.send(String(accountId), payload);
    httpResponse(req, res, 200, "Message sent successfully", result);
  }

  async getMedia(req: Request, res: Response) {
    const { accountId, mediaId } = req.params;
    const result = await this.messageService.getMedia(accountId, mediaId);

    res.setHeader(
      "Content-Type",
      result.contentType || "application/octet-stream",
    );

    res.setHeader(
      "Content-Length",
      result.contentLength || result.buffer.length,
    );

    res.setHeader("Content-Disposition", "inline");

    res.send(result?.buffer);
  }
}
