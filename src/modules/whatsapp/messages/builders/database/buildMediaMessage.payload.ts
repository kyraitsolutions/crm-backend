export class BuildMediaMessagePayload {
  static build(payload: any, context: any) {
    const media = context.media;

    return {
      media: {
        type: payload.type,
        [payload.type]: {
          ...(media?.id && { id: media.id }),
          ...(media?.link && { link: media.link }),

          ...(payload.file?.size && {
            size: payload.file.size,
          }),

          ...(payload.file?.mimetype && {
            mimetype: payload.file.mimetype,
          }),

          ...(payload.file?.originalname && {
            filename: payload.file.originalname,
          }),
        },
      },

      ...(payload[payload.type]?.caption && {
        searchText: payload[payload.type].caption,
      }),
    };
  }
}
