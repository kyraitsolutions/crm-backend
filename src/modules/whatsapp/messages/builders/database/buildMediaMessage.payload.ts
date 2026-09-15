export class BuildMediaMessagePayload {
  static build(payload: any, context: any) {
    const media = context.media;
    console.log("payload", payload);
    console.log("media", media);

    return {
      media: {
        type: payload.type,
        [payload.type]: {
          ...(media?.id && { id: media.id }),
          ...(media?.link && { link: media.link }),

          ...((payload.file?.size || payload[payload.type]?.size) && {
            size: payload.file?.size || payload[payload.type]?.size,
          }),

          ...((payload.file?.mimetype || payload[payload.type]?.mimeType) && {
            mimetype: payload.file?.mimetype || payload[payload.type]?.mimeType,
          }),

          ...((payload.file?.originalname || payload[payload.type]?.filename) && {
            filename:
              payload.file?.originalname || payload[payload.type]?.filename,
          }),
        },
      },

      ...(payload[payload.type]?.caption && {
        searchText: payload[payload.type].caption,
      }),
    };
  }
}
