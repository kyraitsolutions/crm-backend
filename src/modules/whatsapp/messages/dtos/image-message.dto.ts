import { mediaValidator } from "../utils/media-validator.js";

export class ImageMessageDto {
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };

  file?: Express.Multer.File;

  constructor(data: any) {
    this.image = data.image;
    this.file = data.file;
  }

  validate() {
    // File upload
    if (this.file) {
      // if (!this.file.mimetype.startsWith("image/")) {
      //   throw new Error("Uploaded file must be an image.");
      // }
      mediaValidator.validate(this.file, "image");
      return;
    }

    // Existing Meta media id
    if (this.image?.id) {
      return;
    }

    // External URL
    if (this.image?.link) {
      return;
    }

    throw new Error(
      "Provide either an uploaded file, image.link, or image.id.",
    );
  }
}
