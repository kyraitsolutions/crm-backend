import { Router } from "express";
import { upload } from "../../../../config/multer.config.js";
import { AuthMiddleware } from "../../../../middleware/auth.middleware.js";
import { requirePermission } from "../../../../middleware/authorization.middleware.js";
import { IMPORT_PERMISSION } from "../constants/import.constant.js";
import { createContactImportController } from "./contact-import.controller.js";
import type { ContactImportHttpService } from "./import-http.service.js";

export function createContactImportRouter(
  service: ContactImportHttpService,
  options: { authenticate?: boolean } = {},
): Router {
  const router = Router({ mergeParams: true });
  const controller = createContactImportController(service);
  if (options.authenticate !== false) {
    router.use(AuthMiddleware.authenticate, requirePermission(IMPORT_PERMISSION));
  }
  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/config", controller.getConfig);
  router.post("/:jobId/local-upload", upload.single("file"), controller.putLocalSource);
  router.post("/:jobId/complete-upload", controller.completeUpload);
  router.get("/:jobId/preview", controller.preview);
  router.post("/:jobId/dry-run", controller.dryRun);
  router.post("/:jobId/start", controller.start);
  router.post("/:jobId/pause", controller.pause);
  router.post("/:jobId/resume", controller.resume);
  router.post("/:jobId/cancel", controller.cancel);
  router.get("/:jobId/events", controller.events);
  router.get("/:jobId/errors/file", controller.errorFile);
  router.get("/:jobId/errors", controller.errors);
  router.get("/:jobId", controller.getStatus);
  return router;
}
