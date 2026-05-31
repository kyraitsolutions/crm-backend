import { NextFunction, Request, Response } from "express";
import httpResponse from "../utils/http.response.js";
import { configBootstrapService } from "../container.js";
import { ConfigurationItemDto } from "../dtos/configuration.dto.js";

export class ConfigurationController {
  getConfigurations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const organizationId = req.user?.organizationId;
      const { module, configType } = req.query;

      const result = await configBootstrapService.getConfigurations({
        organizationId: organizationId as string,
        module: module as string,
        configType: configType as string,
      });

      httpResponse(
        req,
        res,
        200,
        "Configurations fetched successfully",
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  createConfigItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = new ConfigurationItemDto(req.body);
      const result = await configBootstrapService.createConfigItem(
        req.params.configId,
        dto,
      );

      httpResponse(
        req,
        res,
        201,
        "Configuration item created successfully",
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  updateConfigItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = req.body;

      const result = await configBootstrapService.updateConfigItem(
        req.params.configId,
        req.params.itemId,
        dto,
      );

      httpResponse(req, res, 200, "Configuration item updated successfully", {
        doc: result,
      });
    } catch (error) {
      next(error);
    }
  };

  deleteConfigItem = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await configBootstrapService.deleteConfigItem(
        req.params.configId,
        req.params.itemId,
      );

      httpResponse(
        req,
        res,
        200,
        "Configuration item deleted successfully",
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  reorderConfigItems = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await configBootstrapService.reorderConfigItems(
        req.params.configId,
        req.body.items,
      );

      httpResponse(req, res, 200, "Configuration reordered successfully", {
        doc: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
