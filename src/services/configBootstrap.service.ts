import { ClientSession } from "mongoose";

import { DEFAULT_CONFIGS } from "../constants";
import { ConfigurationItemDto } from "../dtos/configuration.dto";
import { ConfigRepository } from "../repositories/config.repository";

export class ConfigBootstrapService {
  constructor(private configRepository: ConfigRepository) {}

  async seedDefaultConfigs({
    organizationId,
    userId,
    session,
  }: {
    organizationId: string;
    userId: string;
    session: ClientSession;
  }) {
    const configs = DEFAULT_CONFIGS.map((config) => ({
      ...config,
      organizationId,
      createdBy: userId,
    }));

    await this.configRepository.insertMany(configs as any, session);
  }

  async getConfigurations({
    organizationId,
    module,
    configType,
  }: {
    organizationId: string;
    module?: string;
    configType?: string;
  }) {
    const configs = await this.configRepository.findConfigurations({
      organizationId,
      module,
      configType,
    });

    return {
      doc: configs,
    };
  }

  async createConfigItem(configId: string, dto: ConfigurationItemDto) {
    const config = await this.configRepository.findById(configId);

    if (!config) {
      throw new Error("Configuration not found");
    }

    const labelExists = config.values.some(
      (item) => item.label.toLowerCase() === dto?.label?.toLowerCase(),
    );

    if (labelExists) {
      throw new Error("Status label already exists");
    }

    const keyExists = config.values.some((item) => item.key === dto.key);

    if (keyExists) {
      throw new Error("Status key already exists");
    }

    if (!dto?.key) {
      const key = await this.generateKey(String(dto?.label));
      dto.key = key;
    }

    if (!dto?.order) {
      dto.order = config.values.length + 1;
    }

    return this.configRepository.addItem(configId, dto);
  }

  async updateConfigItem(configId: string, itemId: string, dto: any) {
    return this.configRepository.updateItem(configId, itemId, dto);
  }

  async deleteConfigItem(configId: string, itemId: string) {
    return this.configRepository.removeItem(configId, itemId);
  }

  async reorderConfigItems(
    configId: string,
    items: {
      id: string;
      order: number;
    }[],
  ) {
    return this.configRepository.reorderItems(configId, items);
  }

  async generateKey(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");
  }
}
