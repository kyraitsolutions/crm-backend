type MediaConfig = {
  maxSize: number;
  mimeTypes: string[];
};

export const MEDIA: Record<string, MediaConfig> = {
  image: {
    maxSize: 5 * 1024 * 1024,
    mimeTypes: [
      "png",
      "jpg",
      "jpeg",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ],
  },

  video: {
    maxSize: 100 * 1024 * 1024,
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime", "mp4", "webm"],
  },

  document: {
    maxSize: 20 * 1024 * 1024,
    mimeTypes: [
      "pdf",
      "doc",
      "docx",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },

  audio: {
    maxSize: 20 * 1024 * 1024,
    mimeTypes: ["audio/mpeg", "audio/wav"],
  },
};
