// controllers/media.controller.ts
import { Request, Response } from "express";
import { mediaService } from "../container.js";
import httpResponse from "../utils/http.response.js";

export class MediaController {
  createMediaUploadUrl = async (req: Request, res: Response) => {
    const user = req.user;
    const dtoPayload = {
      userId: user?.id,
      ...req.body,
    };

    try {
      const data = await mediaService.createMediaUploadUrl(dtoPayload);
      httpResponse(req, res, 200, "Presigned url generated successfully", {
        doc: data,
      });
    } catch (error) {
      throw error;
    }
  };
}
