export class BuildVideoPayload {
  static build(payload: any, media: any) {
    if (!media) {
      throw new Error("Video media is required.");
    }

    return {
      type: "video",
      video: {
        ...(media.id ? { id: media.id } : { link: media.link }),
        ...(payload.caption && {
          caption: payload.caption,
        }),
      },
    };
  }
}
