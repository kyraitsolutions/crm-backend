export class BuildTextMessagePayload {
  static build(payload: any) {
    return {
      type: "text",
      body: {
        text: payload.text.body,
      },
      searchText: payload.text.body,
    };
  }
}
