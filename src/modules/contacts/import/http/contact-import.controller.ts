import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../../../utils/asyncHandler.js";
import { HttpError } from "../../../../utils/http.error.js";
import httpResponse from "../../../../utils/http.response.js";
import { IMPORT_ERROR_CODE, IMPORT_PERMISSION } from "../constants/import.constant.js";
import { ContactImportHttpService, type ImportActor } from "./import-http.service.js";

export function createContactImportController(service: ContactImportHttpService) {
  return {
    permission: IMPORT_PERMISSION,
    getConfig: asyncHandler("ContactImportController.getConfig", async (req, res) => {
      const result = await service.getConfig(requireActor(req));
      httpResponse(req, res, 200, "Import config", { doc: result });
    }),
    create: asyncHandler("ContactImportController.create", async (req, res) => {
      const actor = requireActor(req);
      const result = await service.createJob(
        actor,
        requireAccountId(req),
        req.body,
        header(req, "idempotency-key"),
      );
      httpResponse(req, res, 201, "Import job created", { doc: result });
    }),
    putLocalSource: asyncHandler("ContactImportController.putLocalSource", async (req, res) => {
      const uploaded = req.file;
      const fieldKey = typeof req.body?.key === "string" ? req.body.key : undefined;
      const result = await service.putLocalSource(
        requireActor(req),
        requireAccountId(req),
        requireJobId(req),
        uploaded
          ? { buffer: uploaded.buffer, size: uploaded.size }
          : undefined,
        fieldKey,
      );
      httpResponse(req, res, 200, "File stored", { doc: result });
    }),
    completeUpload: asyncHandler("ContactImportController.completeUpload", async (req, res) => {
      const result = await service.completeUpload(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Upload verified", { doc: result });
    }),
    preview: asyncHandler("ContactImportController.preview", async (req, res) => {
      const result = await service.preview(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Import preview", { doc: result });
    }),
    start: asyncHandler("ContactImportController.start", async (req, res) => {
      const result = await service.start(requireActor(req), requireAccountId(req), requireJobId(req), req.body);
      httpResponse(req, res, 200, "Import started", { doc: result });
    }),
    dryRun: asyncHandler("ContactImportController.dryRun", async (req, res) => {
      const result = await service.dryRun(
        requireActor(req),
        requireAccountId(req),
        requireJobId(req),
        req.body,
      );
      httpResponse(req, res, 200, "Import dry-run", { doc: result });
    }),
    pause: asyncHandler("ContactImportController.pause", async (req, res) => {
      const result = await service.pause(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Import paused", { doc: result });
    }),
    resume: asyncHandler("ContactImportController.resume", async (req, res) => {
      const result = await service.resume(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Import resumed", { doc: result });
    }),
    cancel: asyncHandler("ContactImportController.cancel", async (req, res) => {
      const result = await service.cancel(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Import cancelled", { doc: result });
    }),
    getStatus: asyncHandler("ContactImportController.getStatus", async (req, res) => {
      const result = await service.getStatus(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Import status", { doc: result });
    }),
    list: asyncHandler("ContactImportController.list", async (req, res) => {
      const result = await service.list(requireActor(req), requireAccountId(req), req.query);
      httpResponse(req, res, 200, "Import jobs", result);
    }),
    errors: asyncHandler("ContactImportController.errors", async (req, res) => {
      const result = await service.errorDownload(requireActor(req), requireAccountId(req), requireJobId(req));
      httpResponse(req, res, 200, "Error report", { doc: result });
    }),
    errorFile: asyncHandler("ContactImportController.errorFile", async (req, res) => {
      const file = await service.openErrorReport(requireActor(req), requireAccountId(req), requireJobId(req));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
      await new Promise<void>((resolve, reject) => {
        file.stream.on("error", reject);
        res.on("error", reject);
        res.on("finish", resolve);
        file.stream.pipe(res);
      });
    }),
    events: (req: Request, res: Response, next: NextFunction): void => {
      void (async () => {
        const actor = requireActor(req);
        const accountId = requireAccountId(req);
        const jobId = requireJobId(req);
        await service.getStatus(actor, accountId, jobId);
        if (!service.sse.canConnect(actor.userId)) {
          throw HttpError.tooManyRequests(
            "Too many import event streams for this user",
            undefined,
            IMPORT_ERROR_CODE.IMPORT_RATE_LIMITED,
          );
        }
        res.status(200);
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();
        let cleaned = false;
        const cleanup = service.sse.subscribe(
          { organizationId: actor.organizationId, accountId },
          jobId,
          actor.userId,
          {
            sendSnapshot: (snapshot) => {
              res.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`);
            },
            heartbeat: () => {
              res.write(": heartbeat\n\n");
            },
            close: () => {
              if (!res.writableEnded) {
                res.end();
              }
            },
          },
        );
        const onClose = (): void => {
          if (cleaned) {
            return;
          }
          cleaned = true;
          cleanup();
        };
        req.on("close", onClose);
        res.on("close", onClose);
      })().catch((error: unknown) => next(error));
    },
  };
}

function requireActor(req: Request): ImportActor {
  const userId = req.user?.id;
  const organizationId = req.user?.organizationId;
  if (!userId || !organizationId) {
    throw HttpError.unauthorized("Unauthorized");
  }
  return {
    userId: String(userId),
    organizationId: String(organizationId),
    ip: req.ip,
    userAgent: header(req, "user-agent"),
  };
}

function requireAccountId(req: Request): string {
  const accountId = req.params.accountId;
  if (!accountId) {
    throw HttpError.badRequest("accountId is required");
  }
  return accountId;
}

function requireJobId(req: Request): string {
  const jobId = req.params.jobId;
  if (!jobId) {
    throw HttpError.badRequest("jobId is required");
  }
  return jobId;
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}
