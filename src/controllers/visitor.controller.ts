// controllers/visitor.controller.ts

import { NextFunction, Request, Response } from "express";
import { visitorService } from "../container";
import { InitVisitorDto } from "../dtos/visitor.dto";
import httpResponse from "../utils/http.response";

export class VisitorController {
  public async initializeVisitor(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const visitorPayloadData = new InitVisitorDto(req.body);
      const result = await visitorService.initializeVisitor(visitorPayloadData);

      httpResponse(req, res, 200, "Visitor initialized successfully", {
        doc: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
