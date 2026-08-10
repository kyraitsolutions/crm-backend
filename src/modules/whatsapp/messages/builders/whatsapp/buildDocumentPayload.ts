export class BuildDocumentPayload {
  static build(payload: any, media: any) {
    if (!media) {
      throw new Error("Document media is required.");
    }

    return {
      type: "document",
      document: {
        ...(media.id ? { id: media.id } : { link: media.link }),
        ...(payload.caption && {
          caption: payload.caption,
        }),
      },
    };
  }
}
