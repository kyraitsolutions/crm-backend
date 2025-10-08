export class ChatBotUtil {
  static chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
  ) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let start = 0;
    while (start < words.length) {
      const end = start + chunkSize;
      const chunk = words.slice(start, end).join(" ");
      chunks.push(chunk);

      start += chunkSize - overlap;
    }

    return chunks;
  }
}
