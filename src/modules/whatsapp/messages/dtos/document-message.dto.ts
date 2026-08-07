import { mediaValidator } from "../utils/media-validator.js";

export class DocumentMessageDto {
  document?: {
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
      mediaValidator.validate(this.file, "document");
      return;
    }

    // Existing Meta media id
    if (this.document?.id) {
      return;
    }

    // External URL
    if (this.document?.link) {
      return;
    }

    throw new Error(
      "Provide either an uploaded file, document.link, or document.id.",
    );
  }
}
