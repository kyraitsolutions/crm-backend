import { TTemplateComponent } from "../types/template.types.js";

export class CreateTemplateDto {
  name: string;
  category: string;
  language: string = "en-IN";
  components: TTemplateComponent[] = [];
  parameter_format: string = "POSITIONAL";

  constructor(data: CreateTemplateDto) {
    if (!data.name) throw new Error("name is required");
    if (!data.category) throw new Error("category is required");
    if (!data.language) throw new Error("language is required");
    if (!data.components) throw new Error("components is required");

    if (data.components) {
      const body = data.components.find(
        (component) => component.type === "BODY",
      );
      if (!body) throw new Error("body is required");
    }

    this.name = data.name;
    this.category = data.category;
    this.language = data.language || "en-IN";
    this.components = data.components || [];
    this.parameter_format = data.parameter_format || "POSITIONAL";
  }
}
