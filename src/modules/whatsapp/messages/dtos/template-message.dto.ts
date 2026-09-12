export class TemplateMessageDto {
  template!: {
    name: string;
    parameter_format?: "POSITIONAL" | "NAMED";
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };

  constructor(data: any) {
    this.template = data.template;
  }

  validate() {
    if (!this.template) {
      throw new Error("Template is required.");
    }

    if (!this.template.name) {
      throw new Error("Template name is required.");
    }

    if (!this.template.language?.code) {
      throw new Error("Template language is required.");
    }

    if (
      this.template.parameter_format &&
      !["POSITIONAL", "NAMED"].includes(this.template.parameter_format)
    ) {
      throw new Error("Invalid template parameter format.");
    }

    return this;
  }
}
