export class BuildTemplatePayload {
  static build(payload: any) {
    return {
      type: "template",
      template: {
        name: payload.template.name,
        language: payload.template.language,
        components: payload.template.components ?? [],
      },
    };
  }
}
