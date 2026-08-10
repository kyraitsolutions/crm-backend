// whatsapp/messages/constants/media.constant.ts
interface WhatsAppMediaConfig {
  maxSize: number;
  mimeTypes: readonly string[];
}

export const WHATSAPP_MEDIA = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5 MB
    mimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },

  video: {
    maxSize: 16 * 1024 * 1024, // 16 MB
    mimeTypes: ["video/mp4", "video/3gpp"],
  },

  audio: {
    maxSize: 16 * 1024 * 1024, // 16 MB
    mimeTypes: [
      "audio/aac",
      "audio/amr",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/webm",
      "audio/wav",
    ],
  },

  document: {
    maxSize: 100 * 1024 * 1024, // 100 MB
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      "text/plain",

      "application/zip",
    ],
  },
} satisfies Record<string, WhatsAppMediaConfig>;

export type WhatsAppMediaType = keyof typeof WHATSAPP_MEDIA;
