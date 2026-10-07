import { Request, Response } from "express";
import httpResponse from "../../../../utils/http.response.js";
import { WhatsappMessageService } from "../services/message.service.js";
import { SendMessageDto } from "../dtos/send-message.dto.js";
import { routeParam } from "../../../../utils/route-param.js";

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
    const accountId = routeParam(req.params.accountId);
    const body = parseMultipartJson({ ...req.body });

    const payload = new SendMessageDto({
      ...body,
      file: req.file || null,
    }).validate();

    const result = await this.messageService.send(String(accountId), payload, {
      userId: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
    });
    httpResponse(req, res, 200, "Message sent successfully", result);
  }

  async getMedia(req: Request, res: Response) {
    const accountId = routeParam(req.params.accountId);
    const mediaId = routeParam(req.params.mediaId);
    const result = await this.messageService.getMedia(accountId, mediaId);

    res.setHeader(
      "Content-Type",
      typeof result.contentType === "string"
        ? result.contentType
        : "application/octet-stream",
    );

    res.setHeader(
      "Content-Length",
      typeof result.contentLength === "string" ||
        typeof result.contentLength === "number"
        ? result.contentLength
        : result.buffer.length,
    );

    res.setHeader("Content-Disposition", "inline");

    res.send(result?.buffer);
  }
}
