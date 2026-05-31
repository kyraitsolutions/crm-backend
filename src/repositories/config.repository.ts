import { ClientSession } from "mongoose";
import ConfigDefinition from "../models/configDefinition.model";
import { TConfigDefinition, TConfigValue } from "../types/configuration.type";

export class ConfigRepository {
  async insertMany(
    data: Partial<TConfigDefinition>[],
    session?: ClientSession,
  ): Promise<TConfigDefinition[] | null> {
    const result = await ConfigDefinition.insertMany(data, {
      session,
    });
    return result.map((item) => item.toJSON());
  }

  async findById(id: string): Promise<TConfigDefinition | null> {
    return ConfigDefinition.findById(id);
  }

  async findConfigurations(filters: {
    organizationId: string;
    module?: string;
    configType?: string;
  }): Promise<TConfigDefinition | null> {
    const config = await ConfigDefinition.findOne(filters);
    if (!config) {
      return null;
    }

    return config.toJSON();
  }

  async addItem(
    configId: string,
    item: Partial<TConfigValue>,
  ): Promise<TConfigDefinition | null> {
    return ConfigDefinition.findByIdAndUpdate(
      configId,
      {
        $push: {
          values: item,
        },
      },
      {
        new: true,
      },
    );
  }

  async updateItem(
    configId: string,
    itemId: string,
    dto: Partial<TConfigValue>,
  ): Promise<TConfigDefinition | null> {
    const updateFields = Object.entries(dto).reduce(
      (acc, [key, value]) => {
        acc[`values.$.${key}`] = value;

        return acc;
      },
      {} as Record<string, unknown>,
    );
    return await ConfigDefinition.findOneAndUpdate(
      {
        _id: configId,
        "values._id": itemId,
      },
      {
        $set: updateFields,
      },
      {
        new: true,
      },
    );
  }

  async removeItem(
    configId: string,
    itemId: string,
  ): Promise<TConfigDefinition | null> {
    return await ConfigDefinition.findByIdAndUpdate(
      configId,
      {
        $pull: {
          values: {
            _id: itemId,
          },
        },
      },
      {
        new: true,
      },
    );
  }

  async reorderItems(
    configId: string,
    items: {
      id: string;
      order: number;
    }[],
  ) {
    const config = await ConfigDefinition.findById(configId);

    if (!config) {
      return null;
    }

    const values = config.values.map((value: any) => {
      const found = items.find((item) => item.id === value._id.toString());

      if (found) {
        value.order = found.order;
      }

      return value;
    });

    config.values = values.sort((a: any, b: any) => a.order - b.order);

    return config.save();
  }
}
