import { ClientSession } from "mongoose";

import { ConfigRepository } from "../repositories/config.repository";
import { DEFAULT_CONFIGS } from "../constants";

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

    await this.configRepository.insertMany(configs, session);
  }
}
