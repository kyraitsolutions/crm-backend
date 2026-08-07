export class BuildAudioPayload {
  static build(payload: any, media: any) {
    if (!media) {
      throw new Error("Audio media is required.");
    }

    return {
      type: "audio",
      audio: {
        ...(media.id ? { id: media.id } : { link: media.link }),
        voice: true,
        ...(payload.caption && {
          caption: payload.caption,
        }),
      },
    };
  }
}
