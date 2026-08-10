import { mediaValidator } from "../utils/media-validator.js";

export class VideoMessageDto {
  video?: {
    link?: string;
    id?: string;
    caption?: string;
  };

  file?: Express.Multer.File;

  constructor(data: VideoMessageDto) {
    this.video = data.video;
    this.file = data.file;
  }

  validate() {
    // File upload
    if (this.file) {
      //   if (!this.file.mimetype.startsWith("video/")) {
      //     throw new Error("Uploaded file must be an video.");
      //   }
      mediaValidator.validate(this.file, "video");

      return;
    }

    // Existing Meta media id
    if (this.video?.id) {
      return;
    }

    // External URL
    if (this.video?.link) {
      return;
    }

    throw new Error(
      "Provide either an uploaded file, image.link, or image.id.",
    );
  }
}
