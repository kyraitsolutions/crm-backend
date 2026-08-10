export class TextMessageDto {
  text: any;

  constructor(data: any) {
    this.text = data.text;
  }

  validate() {
    console.log("text message dto");

    if (!this.text) {
      throw new Error("Text payload is required.");
    }

    if (!this.text.body) {
      throw new Error("Text body is required.");
    }
  }
}
