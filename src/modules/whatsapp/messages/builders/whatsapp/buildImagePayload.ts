// builders/whatsapp/buildImagePayload.ts

export class BuildImagePayload {
  static build(payload: any, media: any) {
    if (!media) {
      throw new Error("Image media is required.");
    }

    return {
      type: "image",
      image: {
        ...(media.id ? { id: media.id } : { link: media.link }),
        ...(payload.caption && {
          caption: payload.caption,
        }),
      },
    };
  }
}
