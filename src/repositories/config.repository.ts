import { ClientSession } from "mongoose";
import ConfigDefinition from "../models/configDefinition.model";

export class ConfigRepository {
  async insertMany(data: any[], session?: ClientSession) {
    return await ConfigDefinition.insertMany(data, {
      session,
    });
  }
}
