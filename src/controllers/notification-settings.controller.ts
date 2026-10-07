import { NextFunction, Request, Response } from "express";
import { handleRouteError } from "../utils/asyncHandler.js";
import httpResponse from "../utils/http.response.js";
import { HttpError } from "../utils/http.error.js";
import { notificationSettingsService } from "../modules/notifications/services/notification-settings.service.js";
import { notificationMuteService } from "../modules/notifications/services/notification-mute.service.js";
import { staffAlertService } from "../modules/notifications/services/staff-alert.service.js";

export class NotificationSettingsController {
  private context(req: Request) {
    const organizationId = String(req.user?.organizationId || "");
    const userId = String(req.user?.id || "");
    if (!organizationId || !userId) {
      throw HttpError.forbidden("Organization and user are required");
    }
    const roleName = String(
      (req.user as { role?: { name?: string } })?.role?.name || "",
    );
    const accountId = String(
      req.body?.accountId ||
        req.query?.accountId ||
        (req.headers["x-account-id"] as string) ||
        (req.user as { accountId?: string })?.accountId ||
        "",
    );
    return { organizationId, userId, roleName, accountId };
  }

  getCatalog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const catalog = notificationSettingsService.getCatalog();
      httpResponse(req, res, 200, "Notification catalog", catalog);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const settings = await notificationSettingsService.getSettings(
        organizationId,
        userId,
      );
      httpResponse(req, res, 200, "Notification settings", { settings });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const settings = await notificationSettingsService.updateSettings(
        organizationId,
        userId,
        req.body || {},
      );
      httpResponse(req, res, 200, "Notification settings updated", {
        settings,
      });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  getPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const preferences = await notificationSettingsService.getPreferences(
        organizationId,
        userId,
      );
      httpResponse(req, res, 200, "Notification preferences", { preferences });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  updatePreferences = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { organizationId, userId } = this.context(req);
      const items = Array.isArray(req.body?.preferences)
        ? req.body.preferences
        : Array.isArray(req.body)
          ? req.body
          : [];
      const preferences = await notificationSettingsService.upsertPreferences(
        organizationId,
        userId,
        items,
      );
      httpResponse(req, res, 200, "Notification preferences updated", {
        preferences,
      });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  applyPreset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const preset = String(req.body?.preset || "");
      if (!["recommended", "quiet", "everything"].includes(preset)) {
        throw HttpError.badRequest(
          "preset must be recommended | quiet | everything",
        );
      }
      const result = await notificationSettingsService.applyPreset(
        organizationId,
        userId,
        preset as "recommended" | "quiet" | "everything",
      );
      httpResponse(req, res, 200, "Notification preset applied", result);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  sendTest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId, accountId } = this.context(req);
      const result = await notificationSettingsService.sendTest(
        organizationId,
        accountId,
        userId,
      );
      httpResponse(req, res, 200, "Test notification sent", result);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  getWorkspacePolicy = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { organizationId } = this.context(req);
      const policy =
        await notificationSettingsService.getWorkspacePolicy(organizationId);
      httpResponse(req, res, 200, "Workspace notification policy", { policy });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  updateWorkspacePolicy = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { organizationId, roleName } = this.context(req);
      const policy = await notificationSettingsService.updateWorkspacePolicy(
        organizationId,
        roleName,
        req.body || {},
      );
      httpResponse(req, res, 200, "Workspace notification policy updated", {
        policy,
      });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  getDeliveryDebug = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { organizationId, userId } = this.context(req);
      const eventKey = req.query.eventKey
        ? String(req.query.eventKey)
        : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const result = await notificationSettingsService.getDeliveryDebug(
        organizationId,
        userId,
        eventKey,
        limit,
      );
      httpResponse(req, res, 200, "Notification delivery debug", result);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  migrateLegacy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const result = await notificationSettingsService.migrateLegacyToggles(
        organizationId,
        userId,
        req.body?.toggles || req.body || {},
      );
      httpResponse(req, res, 200, "Legacy notification toggles migrated", result);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  mute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const mute = await notificationMuteService.mute({
        organizationId,
        userId,
        entityType: String(req.body?.entityType || ""),
        entityId: String(req.body?.entityId || ""),
        until: req.body?.until ?? null,
        reason: req.body?.reason ?? null,
      });
      httpResponse(req, res, 200, "Entity muted", { mute });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  unmute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const result = await notificationMuteService.unmute({
        organizationId,
        userId,
        entityType: String(req.body?.entityType || req.query?.entityType || ""),
        entityId: String(req.body?.entityId || req.query?.entityId || ""),
      });
      httpResponse(req, res, 200, "Entity unmuted", result);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  listMutes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, userId } = this.context(req);
      const result = await notificationMuteService.list(organizationId, userId);
      httpResponse(req, res, 200, "Notification mutes", result);
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  getStaffAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { organizationId, accountId } = this.context(req);
      if (!accountId) {
        throw HttpError.badRequest("accountId is required");
      }
      const config = await staffAlertService.getConfig(
        organizationId,
        accountId,
      );
      httpResponse(req, res, 200, "Staff alert config", { config });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };

  updateStaffAlerts = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { organizationId, accountId: ctxAccountId, roleName } =
        this.context(req);
      const accountId = String(req.body?.accountId || ctxAccountId || "");
      if (!accountId) {
        throw HttpError.badRequest("accountId is required");
      }
      if (roleName !== "OWNER") {
        throw HttpError.forbidden(
          "Only the account owner can change team alert settings",
        );
      }
      const config = await staffAlertService.upsertConfig(
        organizationId,
        accountId,
        req.body || {},
      );
      httpResponse(req, res, 200, "Staff alert config updated", { config });
    } catch (error) {
      handleRouteError("NotificationSettingsController", error, next, req);
    }
  };
}
