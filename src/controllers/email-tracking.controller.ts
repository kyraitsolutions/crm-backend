import { NextFunction, Request, Response } from "express";
import { emailMarketingService } from "../services/email-marketing.service.js";
import { handleRouteError } from "../utils/asyncHandler.js";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export class EmailTrackingController {
  private ref(req: Request) {
    const value = String(req.params.id || req.params.token || "");
    return decodeURIComponent(value).replace(/\.gif$/i, "");
  }

  open = async (req: Request, res: Response) => {
    try {
      await emailMarketingService.trackOpen(this.ref(req));
    } catch {
      // Always return a pixel so inbox clients do not retry as an error.
    }
    res.setHeader("Content-Type", "image/gif");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.status(200).end(PIXEL);
  };

  click = async (req: Request, res: Response) => {
    try {
      const url = await emailMarketingService.trackClick(this.ref(req));
      res.redirect(302, url || "https://kyraitsolutions.com");
    } catch {
      res.redirect(302, "https://kyraitsolutions.com");
    }
  };

  unsubscribePage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = this.ref(req);
      if (req.method === "POST") {
        const result = await emailMarketingService.unsubscribe(token);
        res
          .status(200)
          .type("html")
          .send(
            `<html><body style="font-family:sans-serif;padding:40px"><h1>Unsubscribed</h1><p>${result.email} will no longer receive marketing emails from this organization.</p></body></html>`,
          );
        return;
      }
      res
        .status(200)
        .type("html")
        .send(
          `<html><body style="font-family:sans-serif;padding:40px"><h1>Unsubscribe</h1><p>You will stop receiving marketing emails from this organization.</p><form method="post"><button type="submit">Confirm unsubscribe</button></form></body></html>`,
        );
    } catch (error) {
      handleRouteError("EmailTrackingController.unsubscribe", error, next, req);
    }
  };
}
