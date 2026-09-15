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
    maxSize: 100 * 1024 * 1024,
    mimeTypes: [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ],
  },

  audio: {
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ["audio/mpeg", "audio/wav"],
  },
};
