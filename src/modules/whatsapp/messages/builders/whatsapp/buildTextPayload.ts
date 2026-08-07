export class BuildTextPayload {
  public static build(payload: any) {
    return {
      type: "text",
      text: {
        body: payload.text.body,
      },
    };
  }
}
