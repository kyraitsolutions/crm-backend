import { mediaValidator } from "../utils/media-validator.js";

export class AudioMessageDto {
  audio?: {
    link?: string;
    id?: string;
    caption?: string;
  };

  file?: Express.Multer.File;

  constructor(data: DocumentMessageDto) {
    this.document = data.document;
    this.file = data.file;
  }

  validate() {
    // File upload
    if (this.file) {
      mediaValidator.validate(this.file, "audio");
      return;
    }

    // Existing Meta media id
    if (this.audio?.id) {
      return;
    }

    // External URL
    if (this.audio?.link) {
      return;
    }

    throw new Error(
      "Provide either an uploaded file, audio.link, or audio.id.",
    );
  }
}
