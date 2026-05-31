export class ConfigurationItemDto {
  key!: string;
  label?: string;
  color?: string;
  order?: number;

  constructor(data: ConfigurationItemDto) {
    Object.assign(this, data);

    if (!this.label) throw new Error("label is required");
    if (this.key && this.key !== this.key.toLowerCase())
      throw new Error("key should be lowercase");

    if ("system" in data) {
      throw new Error("system field is not allowed");
    }

    if ("isDefault" in data) {
      throw new Error("isDefault field is not allowed");
    }

    if ("editable" in data) {
      throw new Error("editable field is not allowed");
    }

    if ("deletable" in data) {
      throw new Error("deletable field is not allowed");
    }
  }
}
