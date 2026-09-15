import { HttpError } from "../../../../utils/http.error.js";
import {
  CANNED_MESSAGE_STATUS,
  CANNED_MESSAGE_TYPES,
} from "../constants/canned.constant.js";

const toShortcut = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

export class UpsertWhatsAppCannedMessageDto {
  name: string;
  shortcut: string;
  type: string;
  text: string;
  category?: string;
  status?: string;
  favourite?: boolean;
  media?: {
    url: string;
    key?: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
  } | null;

  constructor(data: Record<string, any>) {
    this.name = String(data.name || "").trim();
    if (!this.name) throw HttpError.badRequest("Name is required");

    this.shortcut = toShortcut(data.shortcut || this.name);
    if (!this.shortcut) throw HttpError.badRequest("Shortcut is required");

    this.type = String(data.type || "text").toLowerCase();
    if (!CANNED_MESSAGE_TYPES.includes(this.type as any)) {
      throw HttpError.badRequest("Unsupported canned message type");
    }

    this.text = String(data.text || data.caption || "").trim();
    this.category = data.category ? String(data.category) : "";
    this.status = data.status || CANNED_MESSAGE_STATUS.PUBLISHED;
    this.favourite = Boolean(data.favourite);

    if (this.type === "text" && !this.text) {
      throw HttpError.badRequest("Message text is required");
    }

    if (this.type !== "text") {
      const media = data.media || {};
      if (!media.url) {
        throw HttpError.badRequest("Upload media for this canned message");
      }
      this.media = {
        url: String(media.url),
        key: media.key,
        fileName: media.fileName || media.name,
        mimeType: media.mimeType,
        size: media.size,
      };
    } else {
      this.media = null;
    }
  }
}
