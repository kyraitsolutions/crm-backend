import { AudioMessageDto } from "./audio-message.dto.js";
import { DocumentMessageDto } from "./document-message.dto.js";
import { ImageMessageDto } from "./image-message.dto.js";
import { TextMessageDto } from "./text-message.dto.js";
import { VideoMessageDto } from "./video-message.dto.js";

export class SendMessageDto {
  to!: string;
  type!: string;
  file!: Express.Multer.File | null;
  text!: any;
  image!: any;

  constructor(data: Partial<SendMessageDto>) {
    // this.to = data.to;
    // this.type = data.type;
    // this.text = data.text;
    // this.image = data.image;
    // this.file = data.file;
    Object.assign(this, data);
  }

  validate() {
    console.log(this);

    if (!this.to) {
      throw new Error("Recipient is required.");
    }

    if (!this.type) {
      throw new Error("Message type is required.");
    }

    switch (this.type) {
      case "text":
        new TextMessageDto(this).validate();
        break;

      case "image":
        new ImageMessageDto(this).validate();
        break;

      case "video":
        new VideoMessageDto(this).validate();
        break;

      case "document":
        new DocumentMessageDto(this).validate();
        break;

      case "audio":
        new AudioMessageDto(this).validate();
        break;

      default:
        throw new Error(`Unsupported type: ${this.type}`);
    }

    return this;
  }
}
